import { server } from './server/server.ts'
import * as CLI from './dependencies/cli.ts'

/**
 * Handle cli, see man.cli.txt
 * @param {string} option [OPTION] parameter
 * @param {string[]} args [ARGS]... parameters
 * @returns {Promise<0 | 1>} Exit code
 */
const main = async (option: string, ...args: string[]) => {
    //Parse binaries
    if (option === '--parse-bin' || option === '-b') {
        const source = args[0]
        const output = args[args.indexOf('-o') + 1 || args.indexOf('--output') + 1 || -1] ?? './rawDatas'
        const prefix = args[args.indexOf('--prefix') + 1 || -1]
        const forcedChannels = JSON.parse(`[${args[args.indexOf('--forced') + 1 || -1] ?? ''}]`)
        await CLI.parseBin(source, output, prefix, forcedChannels)
        return 0
    }
    
    //Parse RawData[]
    if (option === '--parse' || option === '-p') {
        const source = args[0]
        const output = (args[1] === '-o' || args[1] === '--output') ? args[2] : './data.json'
        await CLI.parse(source, output)
        return 0
    }
    
    //Default
    //Start GUI
    if (option === '--port' || option === undefined) {
        const port = parseInt(args[0])
        server(Number.isNaN(port) ? 8080 : port)
        return 0
    }

    //Dsplay help
    if (option === '--help' || option === '-h') {
        const help = await Deno.readTextFile('man.cli.txt')
        console.log(help)
        return 0
    }
    
    return 1
}

const [option, ...args] = Deno.args
await main(option, ...args)