interface Data {
    voltage: number
    time: TimeConfig
    mean: number
    sigma: number
    histogram: {
        x: number[]
        y: number[]
    }
}

interface TimeConfig {
    width: number //width include rise
    rise: number
    fall: number
}

type Path = string

/**
 * Parse a single amplitude of the gene
 * @param {Path} path File to parse (.dat)
 * @param {TimeConfig} config Time config of the gene
 * @returns {Promise<Data>} parsed data
 */
const parseSingle = async (path: string, config: TimeConfig): Promise<Data> => {
    //Read voltage from path
    const voltage = parseInt((path?.match(/Run_([0-9])\d*/g) ?? [''])[0].replace('Run_', ''))
    
    const text = await Deno.readTextFile(path)
    
    const mean = parseFloat((text?.match(/== Mean Charge =(.*)\d+/g) ?? [''])[0].replace('== Mean Charge =', ''))
    //deno-lint-ignore no-regex-spaces
    const sigma = parseFloat((text?.match(/== Charge Sigma  =(.*)\d+/g) ?? [''])[0].replace('== Charge Sigma  =', ''))
    const x = text
        .split('X AXIS')[1]
        .split('\n')[1]
        .split('== Y AXIS')[0]
        .split(' ')
        .map(e => parseFloat(e))
        .filter(e => !isNaN(e))
    const y = text
        .split('Y AXIS')[1]
        .split('\n')[1]
        .split('== Mean Charge')[0]
        .split(' ')
        .map(e => parseFloat(e))
        .filter(e => !isNaN(e))

    return {
        voltage: voltage,
        time: config,
        mean: mean,
        sigma: sigma,
        histogram: {
            x: x,
            y: y
        }
    }
}

/**
 * Parse all amplitude of a directory
 * @param {Path} dirPath directory containing dat files
 * @param {TimeConfig} config Time config of the gene
 * @returns {Promise<Data[]>} list of parsed data
 */
const parse = async (dirPath: string, config: TimeConfig): Promise<Data[]> => {
    const datas: Data[] = []
    for await (const dirEntry of Deno.readDir(dirPath)) {
        //Check filename before parse
        if ((dirEntry.name.startsWith('Run_') && (dirEntry.name.endsWith('.dat')))) {
            datas.push(await parseSingle(`${dirPath}/${dirEntry.name}`, config))
        }
    }

    return datas
}

export { parseSingle, parse }
export type { Data, TimeConfig }

