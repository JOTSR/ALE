import ProgressBar from 'https://deno.land/x/progress@v1.0.0/mod.ts'
import { existsSync } from 'https://deno.land/std@0.97.0/fs/mod.ts'
import * as ABC from './abcAdapter.ts'
import * as BIN from './abcBinReader.ts'

/**
 * CLI adapter for parsing and analyze datas
 */

type Path = string

/**
 * Parse binary files onto RawData[] for further analysis
 * @param {Path} sourcePath (directory of | subdirectory that contains) binary files of ABC card
 * @param {Path} outDir Output directory to store RawData[] .json files of parsed bins
 * @param {string} prefix Prefix for .json out files, default "raw_data"
 * @param {number[]} forcedChannels Forced channels to focus on and keep after ceaning unwanted event, default []
 */
const parseBin = async (sourcePath: Path, outDir: Path, prefix = 'raw_data', forcedChannels: number[] = []) => {
  //Test source path before parsing
  const absSourcePath = existsSync(sourcePath) ? sourcePath : `${Deno.cwd()}/${sourcePath}`
  if (!existsSync(absSourcePath)) throw new Error(`No such file at ${absSourcePath}`)

  //Make out dir if necessary
  await Deno.mkdir(outDir, {recursive: true})

  const { isFile, isDirectory, size } = await Deno.stat(absSourcePath)
  if (isFile) {
    //Progressbar for UI
    const progress = new ProgressBar({total: size, clear: true})
    let comp = 0
    const cb = (_e: Event) => progress.render(comp += 9)
    
    //Parse single bin file
    const rawData = await BIN.parseBin(absSourcePath, forcedChannels, cb as unknown as EventListenerObject)
    const jsonFile = JSON.stringify(rawData)
    await Deno.writeTextFile(`${outDir}/${prefix}_bin_ch${rawData[0].focus.join('_')}${Math.round(Math.random() * 100)}.json`, jsonFile)

    console.log('\nBinaries parse OK')
    return
  }
  if (isDirectory) {
    //Progressbar for UI
    let count = 0
    for await (const subDir of Deno.readDir(absSourcePath)) {
      if (subDir.isDirectory) for await (const entry of Deno.readDir(`${absSourcePath}/${subDir.name}`)) if (entry.isFile && entry.name.endsWith('.bin')) count++
      if (subDir.isFile && subDir.name.endsWith('.bin')) count++
    }
    const progress = new ProgressBar({total: count, clear: true})
    let comp = 0
  
    for await (const subDir of Deno.readDir(absSourcePath)) {
        if (subDir.isDirectory) {
            //Parse single measure serie
            const incr = (_e: Event) => comp++ //Callback for increment comp
            const rawDatas = await BIN.parseSingle(`${absSourcePath}/${subDir.name}`, forcedChannels, incr as unknown as EventListenerObject)
            if (rawDatas.length !== 0) {
              const jsonFile = JSON.stringify(rawDatas)
              await Deno.writeTextFile(`${outDir}/${prefix}_single_ch${rawDatas[0].focus.join('_')}_#${Math.round(Math.random() * 100)}.json`, jsonFile)
              if (comp < count) progress.render(comp)
            }
        } 
        if (subDir.isFile && subDir.name.endsWith('.bin')) {
          //Parse single bin file
          const rawData = await BIN.parseBin(`${absSourcePath}/${subDir.name}`, forcedChannels)
          const jsonFile = JSON.stringify(rawData)
          await Deno.writeTextFile(`${outDir}/${prefix}_single_bin_ch${rawData[0].focus.join('_')}_Amp${rawData[0].amplitude}_G${rawData[0].gain}_#${Math.round(Math.random() * 100)}.json`, jsonFile)
          if (comp < count) progress.render(++comp)
        }
    }
    console.log('\nBinaries parse OK')
    return
  } 
}

/**
 * Parse RawData[] onto Data[] (clean unwanted event, calcul finetime, group same channel event, group HG & LG)
 * @param {Path} sourcePath (file | directory) of RawData[] *.json files
 * @param {Path} outFile Data[] json file
 */
const parse = async (sourcePath: Path, outFile: Path) => {
  //Test source path before parsing
  const absSourcePath = existsSync(sourcePath) ? sourcePath : `${Deno.cwd()}/${sourcePath}`
  if (!existsSync(absSourcePath)) throw new Error(`No such file at ${absSourcePath}`)

  //Test out path before parsing, throw error if cannot create out file
  await Deno.create(outFile)
  
  const { isFile, isDirectory } = await Deno.stat(absSourcePath)

  let size = 0
  if (isFile) size = 1
  if (isDirectory) for await (const dirEntry of Deno.readDir(absSourcePath)) if (dirEntry.isFile && dirEntry.name.endsWith('.json')) size++

  //Progressbar for UI
  const progress = new ProgressBar({total: size, clear: true})
  let comp = 0
  
  const datas: ABC.Data[] = []
  
  //Parse raw datas
  if (isFile) {
    const file = await Deno.readTextFile(sourcePath)
    datas.push(...ABC.parse(...JSON.parse(file)))
  }
  else if (isDirectory) {
    //Parse all json in souce directory
    for await (const dirEntry of Deno.readDir(absSourcePath)) {
      if (dirEntry.isFile && dirEntry.name.endsWith('.json')) {
        const file = await Deno.readTextFile(`${absSourcePath}/${dirEntry.name}`)
        datas.push(...ABC.parse(...JSON.parse(file)))
        progress.render(comp++)
      }
    }
  } 

  await Deno.writeTextFile(outFile, JSON.stringify(datas))

  console.log('\nParse raw OK')
  return 0  
}

export { parse, parseBin }