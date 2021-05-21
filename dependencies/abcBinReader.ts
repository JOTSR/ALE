interface RawData {
    focus: channelID[]
    amplitude: number
    gain: number
	channelEvent: {
		header: Header
		data: channelData[]
	}
}

interface channelData {
	channel: channelID
	timestamp: number
	charge: number
}

interface Header {
	codeHeader: number
	timestamp: number //abc timestamp
	hitType: 'ping' | 'pong' | 'deadTime'
	recordedChannels: number
	hitRegister: channelID[]
}

type channelID = number

type Path = string


/**
 * Convert a byteArray onto a decimal value
 * @param byteArray 
 * @returns Return decimal value
 */
const byteArrayToDecimal = (byteArray: Uint8Array) => {
	return new Array(...byteArray)
		.reverse()
		.map((e, i) => e * 16 ** i)
		.reduce((prev, curr) => prev + curr)
}

/**
 * Transpose the 16B input array onto a list of hited channels
 * @param byteArray 
 * @returns Return hited channels
 */
const hitRegisterHandle = (byteArray: Uint8Array) => {
	return new Array(...byteArray)
		.reverse()
		.map((bit, index) => bit * index)
		.filter(e => e != 0)
}

/**
 * Parse a chunk of byte
 * @param byteArray chunk of byte to parse
 * @param format chunk type
 * @returns parsed chunk
 */
const singleParse = (
	byteArray: Uint8Array,
	format: 'header' | 'channel'
): (Header | channelData) => {
	if (format === 'header')
		return {
			codeHeader: byteArray[0],
			timestamp: byteArrayToDecimal(byteArray.slice(1, 9)),
			recordedChannels: byteArray[9],
			hitType:
				byteArray[10] == 0
					? 'ping'
					: byteArray[10] == 1
						? 'pong'
						: 'deadTime',
			hitRegister: hitRegisterHandle(byteArray.slice(11, 28)),
		}
	if (format === 'channel')
		return {
			channel: byteArray[0],
            //ajouter correction histogramme finetime
            timestamp: (byteArrayToDecimal(byteArray.slice(1, 4)) + (byteArrayToDecimal(byteArray.slice(6, 8)) / 1023)) * 25e-9,
			charge: byteArrayToDecimal(byteArray.slice(4, 6)),
		}
	throw new Error('Unknown data format')
}

/**
 * Parse raw data for further processing 
 * @param path bin file path
 * @returns parsed bin data
 */
const parseRaw = async (path: string, ...forceFocus: channelID[]): Promise<RawData[]> => {
	const data = []
	const file = await Deno.open(path)
	const chunkSize = 27 + 128 * 9 //header chunk size + 128 * channel chunk size
	const { size } = await file.stat()

    //Regex à solidifier, bugs possibles
    //merge forced focus channels and channel in the name of the file
    const focus = [...forceFocus, parseInt((path.match(/Ch([0-9])+/g) ?? ['-1'])[0].replace('Ch', ''))]
    //get the amplitude in the name of the file
    const amplitude = parseInt((path.match(/Ch([0-9])+/g) ?? ['-1'])[0].replace('Ch', ''))
    const gain = parseInt((path.match(/G([0-9])+/g) ?? ['-1'])[0].replace('G', '')) / 100 //Adapter en coulomb

    //Reading of the file chunk by chunk
	for (const _ of new Array(Math.round(size / chunkSize))) {
		await Deno.seek(file.rid, 0, Deno.SeekMode.Current)
		const eventHeader = new Uint8Array(27)
		await file.read(eventHeader)
		const channels = []

        //Reading of channels
		for (const _ of new Array(127)) {
			await Deno.seek(file.rid, 9, Deno.SeekMode.Current)
			const channel = new Uint8Array(9)
			await file.read(channel)
			channels.push(channel)
		}

		data.push({
            focus: focus,
            amplitude: amplitude,
            gain: gain,
			channelEvent: {
				header: singleParse(eventHeader, 'header'),
				data: channels.map((channel) =>
					singleParse(channel, 'channel')
				),
			}
		})
	}
	Deno.close(file.rid)
	return data as RawData[]
}

/**
 * Parse a measurement series, eg: TOBI_CAT0_Ch0_2021-05-05_15-56-32_ABDEL
 * @param directory root directory to browse
 * @param forceFocus channels you want to keep after clean unwanted event
 * @returns Raw data for furhter processing
 */
const parseSingle = async (directory: Path, ...forceFocus: channelID[]) => {
	const raws = []
    //Iterate on all bin in the directory and parse it
	for await (const dirEntry of Deno.readDir(directory)) {
		if (dirEntry.isFile && dirEntry.name.endsWith('.bin')) {
			raws.push(await parseRaw(`${directory}/${dirEntry.name}`, ...forceFocus))
		}
	}
	return raws.flat()
}

/**
 * Parse a list of measurement series
 * @param directory root directory to browse
 * @param forceFocus channels you want to keep after clean unwanted event
 * @returns Raw data for furhter processing 
 */
const parseAll = async (directory: Path, ...forceFocus: channelID[]) => {
	const raws: RawData[] = []
    //Iterate on all dir in the root directory and parse all sub bin
	for await (const subDir of Deno.readDir(directory)) {
		if (subDir.isDirectory && subDir.name.startsWith('TOBI')) {
            raws.push(...await parseSingle(`${directory}/${subDir.name}`, ...forceFocus))
		}
	}
	return raws.flat()
}

export { parseRaw, parseSingle, parseAll }
export type { RawData, channelID }