interface RawData {
    focus: channelID[] //Channel to keep after clean unwanted event
    amplitude: number //Input amplitude
    gain: number //ASICs gain
	channelEvent: {
		header: Header //Event header
		data: ChannelData[]
	}
}

interface ChannelData {
	channel: channelID //Channel hited
	coarseTime: number //Base time of 25MHz
	fineTime: number //Fine time on 25MHz / ~1024
	charge: number //Charge in ADCu
	type: 'ping' | 'pong' //Catch mode
}

interface Header {
	codeHeader: number[] //CAFECAFE (identification of header)
	timestamp: number //abc timestamp
	recordedChannels: number //Number of channels hited during event
	hitRegister: channelID[] //Channels hited during event
}

type channelID = number

type Path = string

/**
 * Convert a byteArray onto a decimal value
 * @param byteArray 
 * @returns Return decimal value
 */
const byteArrayToDecimal = (byteArray: Uint8Array) => {
	let offset = 2 ** (byteArray.length + 1)
	let result = 0
	for (const value of byteArray) {
		result += (offset > 4) ? value << (offset) : value
		offset /= 2
	}
	return result
}

/**
 * Transpose the 16B input array onto a list of hited channels
 * @param byteArray 
 * @returns Return hited channels
 */
const hitRegisterHandle = (byteArray: Uint8Array) => {
	return new Array(...byteArray)
		.map(e => e.toString(2).padStart(8, '0').split(''))
		.flat()
		.map(e => parseInt(e))
		.reverse()
		.map((e, i) => e * i)
		.filter(e => e != 0)
}

/**
 * Parse a chunk of byte
 * @param byteArray chunk of byte to parse
 * @param format chunk type
 * @returns parsed chunk
 */
const parseChunk = (
	byteArray: Uint8Array,
	format: 'header' | 'channel'
): (Header | ChannelData) => {
	if (format === 'header')
	return {
		codeHeader: new Array(...byteArray.slice(0, 4)),
		timestamp: byteArrayToDecimal(byteArray.slice(4, 9)),
		recordedChannels: byteArray[9],
		hitRegister: hitRegisterHandle(new Uint8Array([...byteArray.slice(19, 27), ...byteArray.slice(10, 18)]))
	}
	if (format === 'channel')
		return {
			channel: byteArray[0],
            coarseTime: byteArrayToDecimal(byteArray.slice(1, 5)),
			fineTime: byteArrayToDecimal(byteArray.slice(7, 9)),
			charge: byteArrayToDecimal(byteArray.slice(5, 7)) & 0x7fff,
			type: (byteArray[5] & 0x80) ? 'pong' : 'ping'
		}
	throw new Error('Unknown data format')
}

/**
 * Parse raw data in a bin file for further processing 
 * @param {Path} path bin file path
 * @param {channelID[]} forcedFocus channels to keep after cleaning unwanted event
 * @param {?EventListenerObject} listener callback called for each chunk of 9 bytes
 * @returns {Promise<RawData[]>} parsed bin data
 */
 const parseBin = async (path: string, forceFocus: channelID[], listener?: EventListenerObject): Promise<RawData[]> => {
	
	const event = new Event('progressParseBin')
	if (listener !== undefined) globalThis.addEventListener('progressParseBin', listener)
	
	const datas = []
	const file = await Deno.open(path)
	//const chunkSize = 27 //header chunk size or 3 * channel chunk size
	const { size } = await file.stat()

    //Regex à solidifier, bugs possibles
    const focus = [...forceFocus, parseInt((path.match(/Ch([0-9])+/g) ?? ['-1'])[0].replace('Ch', ''))] //merge forced focus channels and channel in the name of the file
    const amplitude = parseInt((path.match(/Amp([0-9])+/g) ?? ['-1'])[0].replace('Amp', '')) / 10 //get the amplitude in the name of the file
    const gain = parseInt((path.match(/G([0-9])+/g) ?? ['-1'])[0].replace('G', ''))

	let progress = 0

    //Reading of the file chunk by chunk
	while (size > progress) {
		//We store 3 * 9 byte (1 header or 3 channels)
		await Deno.seek(file.rid, 0, Deno.SeekMode.Current) //set file pointer position
		const headerChunk = new Uint8Array(27) //New byte array
		await file.read(headerChunk) //Store buffer into array
		if (JSON.stringify(headerChunk) === JSON.stringify(new Uint8Array(27).fill(0))) break //Break if EOF
		const header = parseChunk(headerChunk, 'header') as unknown as Header

		progress += 27
		if (listener !== undefined) {
			globalThis.dispatchEvent(event)
			globalThis.dispatchEvent(event)
			globalThis.dispatchEvent(event)
		}

		const channels = []

		for (const _ of new Array(header.recordedChannels)) {
			await Deno.seek(file.rid, 0, Deno.SeekMode.Current) //set file pointer position
			const channelChunk = new Uint8Array(9) //New byte array
			await file.read(channelChunk) //Store buffer into array
			if (JSON.stringify(channelChunk) === JSON.stringify(new Uint8Array(9).fill(0))) break //Break if EOF
			channels.push(parseChunk(channelChunk, 'channel'))
			progress += 9
			if (listener !== undefined) globalThis.dispatchEvent(event)
		}

		//Test CAFECAFE if error in header recorded channel number
		const unknownChunk = new Uint8Array(9)
		const hiddenChannels = []
		let isNotHeader = false
		do {
			await Deno.seek(file.rid, 0, Deno.SeekMode.Current)
			await file.read(unknownChunk)
			isNotHeader = JSON.stringify(unknownChunk.slice(0, 4)) !== JSON.stringify(new Uint8Array([202, 254, 202, 254]))
			if (isNotHeader) {
				hiddenChannels.push(parseChunk(unknownChunk, 'channel') as unknown as ChannelData)
				progress += 9
				if (listener !== undefined) globalThis.dispatchEvent(event)
			} else {
				await Deno.seek(file.rid, -9, Deno.SeekMode.Current) //We reset cursor position
				break
			}
		} while (isNotHeader && (size > progress))

			
			datas.push({
				focus: focus,
				amplitude: amplitude,
				gain: gain,
				channelEvent: {
					header: header,
					data: [...channels, ...hiddenChannels.filter(channel => (channel.coarseTime !== 0) && (channel.channel !== 0))]
				}
			})

	}
	Deno.close(file.rid)
	return datas as RawData[]
}

/**
 * Parse a measurement series, eg: TOBI_CAT0_Ch0_2021-05-05_15-56-32_ABDEL
 * @param {Path} directory root directory to browse
 * @param {channelID[]} forceFocus channels you want to keep after clean unwanted event
 * @param {?EventListenerObject} listener callback called for each bin parsed
 * @returns {Promise<RawData[]>} Raw data for furhter processing
 */
const parseSingle = async (directory: Path, forceFocus: channelID[], listener?: EventListenerObject) => {
	const event = new Event('progressParseSingle')
	if (listener !== undefined) globalThis.addEventListener('progressParseSingle', listener)
	
	const raws: RawData[] = []
    //Iterate on all bin in the directory and parse it
	for await (const dirEntry of Deno.readDir(directory)) {
		// console.log(dirEntry.name)
		if (dirEntry.isFile && dirEntry.name.endsWith('.bin')) {
			if (listener !== undefined) globalThis.dispatchEvent(event)
			//console.log('Bin find')
			raws.push(...await parseBin(`${directory}/${dirEntry.name}`, forceFocus))
		}
	}
	return raws.flat()
}

/**
 * Parse a list of measurement series
 * @param {Path} directory root directory to browse
 * @param {channelID[]} forceFocus channels you want to keep after clean unwanted event
 * @param {?EventListenerObject} listener callback called for each subdir parsed
 * @returns {Promise<RawData[]>} Raw data for furhter processing 
 */
const parseAll = async (directory: Path, forceFocus: channelID[], listener?: EventListenerObject) => {
	const event = new Event('progressParseAll')
	if (listener !== undefined) globalThis.addEventListener('progressParseAll', listener)
	
	const raws: RawData[] = []
    //Iterate on all dir in the root directory and parse all sub bin
	for await (const subDir of Deno.readDir(directory)) {
		if (subDir.isDirectory && subDir.name.startsWith('TOBI')) {
			if (listener !== undefined) globalThis.dispatchEvent(event)
            raws.push(...await parseSingle(`${directory}/${subDir.name}`, forceFocus))
		}
	}
	return raws.flat()
}

export { parseBin, parseSingle, parseAll }
export type { RawData, channelID }