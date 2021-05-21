import { parseAll } from '../dependencies/abcBinReader.ts'
import { parse } from '../dependencies/abcAdapter.ts'
import * as GENE from '../dependencies/geneAdapter.ts'

const handleWsMessage = async (messageString: string) => {
    const message = JSON.parse(messageString)
    
    //Echo test
    if (message.type === 'echo') return JSON.stringify({type: 'info', payload: message.payload})
    
    //Debug log
    if (message.type === 'info') {
        console.log(`[ws]: ${message.payload}`)
        return
    }
    
    //Request for parse bin datas (ABC)
    if (message.type === 'abc') {
        const { path, forcedFocus } = message.payload
        console.log('Start parse raw')
        console.time('parse')
        const rawData = await parseAll(path, ...forcedFocus)
        console.timeEnd('parse')
        Deno.writeTextFile('./temp.json', JSON.stringify(rawData))
        //console.log(`rawData: ${rawData}`)
        const data = parse(...rawData)
        return JSON.stringify({type: 'abc', payload: data})
    }
    
    //Request for parse dat datas (GENE)
    if (message.type === 'gene') {
        const { path, config } = message.payload
        const data = await GENE.parse(path, config)
        return JSON.stringify({type: 'gene', payload: data})
    }
    
    throw new Error('Unknown message type')    
}

export { handleWsMessage }