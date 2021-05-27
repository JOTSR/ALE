import { RawData } from './abcBinReader.ts'
import { extremum } from './statsFunc.ts'

interface Data {
	channel: number
	highGain: BaseValue[]
	lowGain: BaseValue[]
}
interface BaseValue {
	date: number //timestamp of ABC card
	timestamp: number //timestamp of the event
	gain: number //ASIC gain
	amplitude: number //Inpult voltage in mV
	charge: number //Measure value in ADCu
}

/**
 * Parse rawData list extracted with abcBinreader to simplest format for processing and analysing
 * @param {RawData[]} rawDatas rawData list of valules from abcBinReader
 * @returns {Data[]} Parsed and cleaned data ready for analysis
 */
const parse = (...rawDatas: RawData[]): Data[] => {
	
	const channels = []
	const globalFocus: number[] = []
	//We catch focused channels and get useful keys
	for (const rawData of rawDatas) {
		const { amplitude, gain, focus } = rawData
		globalFocus.push(...focus)
		const unfilterChannels = rawData.channelEvent.data.map(channelData => ({...channelData, ...rawData.channelEvent.header, amplitude, gain}))
		channels.push(...unfilterChannels.filter(channelData => focus.includes(channelData.channel) || focus.includes(channelData.channel - 128)))
	}
	
	const datas = []
	//We transform messy data in Data object
	for (const channelID of new Set(globalFocus)) {
		const highGainDatas = channels.filter(channel => channel.channel === channelID + 128)
		const lowGainDatas = channels.filter(channel => channel.channel === channelID)

		const highTimestamp = extremum(...highGainDatas.map(channel => channel.fineTime))
		const lowTimestamp = extremum(...lowGainDatas.map(channel => channel.fineTime))

		const data = {
			channel: channelID,
			highGain: highGainDatas.map(channel => {
				return {
					date: channel.timestamp,
					//correct timestamp from finetime histogram
					timestamp: (channel.coarseTime + (channel.fineTime - highTimestamp[0]) / (highTimestamp[0] + highTimestamp[1])) * 25,
					gain: channel.gain,
					amplitude: channel.amplitude,
					charge: channel.charge
				}
			}),
			lowGain: lowGainDatas.map(channel => {
				return {
					date: channel.timestamp,
					//correct timestamp from finetime histogram
					timestamp: (channel.coarseTime + (channel.fineTime - lowTimestamp[0]) / (lowTimestamp[0] + lowTimestamp[1])) * 25,
					gain: channel.gain,
					amplitude: channel.amplitude,
					charge: channel.charge
				}
			})
		}
		datas.push(data)
	}
	return datas
}

export { parse }
export type { Data }
