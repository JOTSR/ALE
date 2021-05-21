import { Data } from './abcAdapter.ts'
import { esperance } from './statsFunc.ts'

const view2D = (
	data: Data[],
	gainMode: 'HG' | 'LG',
	responseMode: 'ping' | 'pong' | 'both',
	x: 'amplitude' | 'charge' | 'rms',
	y: 'amplitude' | 'charge' | 'rms',
    channelList = new Array(128).fill(1).map((_, i) => i)
) => {
	const channels = []

	for (const channel of data) {
        if (channelList.includes(channel.channel)) {
            const gain = gainMode === 'HG' ? channel.highGain : channel.lowGain
    
            const yValue = gain
                .filter((e) => e.ping.rms !== 0 || e.pong.rms !== 0)
                .map((e) => {
                    if (responseMode === 'both')
                        return esperance(e.ping[y], e.pong[y])
                    return e[responseMode][y]
                })
            const xValue = gain
                .filter((e) => e.ping.rms !== 0 || e.pong.rms !== 0)
                .map((e) => {
                    if (responseMode === 'both')
                        return esperance(e.ping[x], e.pong[x])
                    return e[responseMode][x]
                })
    
            channels.push({
                channel: channel.channel,
                title: `Channel[${channel.channel}] in ${gainMode} for ${responseMode}: "${y}"=f("${x}")`,
                value: [xValue, yValue]
            })
        }
	}
    return channels
}

export { view2D }
