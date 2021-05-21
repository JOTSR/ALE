import { RawData } from './abcBinReader.ts'

interface Data {
	channel: number
	highGain: Value[]
	lowGain: Value[]
}

interface Value {
	ping: BaseValue
	pong: BaseValue
}

interface BaseValue {
	time: number
	amplitude: number
	charge: number
	rms: number
}

interface singleData {
	channel: number
	gainMode: 'HG' | 'LG'
	responseMode: 'ping' | 'pong'
	values: BaseValue[]
}

/**
 * Parse rawData list extracted with abcBinreader to simplest format for processing and analysing
 * @param rawDatas rawData list of valules from abcBinReader
 * @returns Parsed and cleaned data ready for analysis
 */
const parse = (...rawDatas: RawData[]) => {
	const messyDatas = []
	for (const rawData of rawDatas) {
		//Iterate on focused channel and parse raw format
		for (const channelID of rawData.focus) {
			const currentChannel = rawData.channelEvent.data[channelID]
			
			const baseValue = {
				time: currentChannel.timestamp,
				amplitude: rawData.amplitude,
				charge: currentChannel.charge,
				rms: 0
				//rms: [currentChannel.charge] //Array for further rms calcul
			}

			const value = {
				ping: rawData.channelEvent.header.hitType == 'ping' ? baseValue : null,
				pong: rawData.channelEvent.header.hitType == 'pong' ? baseValue : null
			}

			const data = {
				channel: channelID,
				highGain: currentChannel.channel < 129 ? value : null,
				lowGain: currentChannel.channel > 128 ? value : null,
			}

			messyDatas.push(data)
		}
	}
	const datas = []
	//Cleaning of messyDatas, merge same channel
	for (const channelID of new Array(128).fill(1).map((_, i) => i + 1)) {
		const sameChannel = messyDatas.filter(messyData => messyData.channel == channelID)

		const highValues = {
			ping: sameChannel.filter(channel => channel.highGain?.ping !== null).map(channel => channel.highGain?.ping),
			pong: sameChannel.filter(channel => channel.highGain?.pong !== null).map(channel => channel.highGain?.pong),
		}

		const lowValues = {
			ping: sameChannel.filter(channel => channel.lowGain?.ping !== null).map(channel => channel.lowGain?.ping),
			pong: sameChannel.filter(channel => channel.lowGain?.pong !== null).map(channel => channel.lowGain?.pong),
		}

		//We "transpose" data to fit interface Value[]
		const highValue: Value[] = []
		highValues.ping.forEach((_, index) => highValue.push({ping: highValues.ping[index] as BaseValue, pong: highValues.pong[index] as BaseValue}))
		
		const lowValue: Value[] = []
		highValues.ping.forEach((_, index) => lowValue.push({ping: lowValues.ping[index] as BaseValue, pong: lowValues.pong[index] as BaseValue}))

		const data = {
			channel: channelID,
			highGain: highValue,
			lowGain: lowValue,
		}
		datas.push(data as Data)
	}
	return datas
}

export { parse }
export type { Data }
