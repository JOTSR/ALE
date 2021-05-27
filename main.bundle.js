const { noColor  } = Deno;
let enabled = !noColor;
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code1) {
    return enabled ? `${code1.open}${str.replace(code1.regexp, code1.open)}${code1.close}` : str;
}
function bgGreen(str) {
    return run(str, code([
        42
    ], 49));
}
function bgWhite(str) {
    return run(str, code([
        47
    ], 49));
}
const isTTY = Deno.isatty(Deno.stdout.rid);
const isWindow = Deno.build.os === 'windows';
var Direction;
(function(Direction1) {
    Direction1[Direction1["left"] = 0] = "left";
    Direction1[Direction1["right"] = 1] = "right";
    Direction1[Direction1["all"] = 2] = "all";
})(Direction || (Direction = {
}));
class ProgressBar {
    title;
    total;
    width;
    complete;
    incomplete;
    clear;
    interval;
    display;
    isCompleted = false;
    lastStr = '';
    start = Date.now();
    time;
    lastRender = 0;
    encoder = new TextEncoder();
    constructor({ title ='' , total , width =50 , complete =bgGreen(' ') , incomplete =bgWhite(' ') , clear =false , interval , display  } = {
    }){
        this.title = title;
        this.total = total;
        this.width = width;
        this.complete = complete;
        this.incomplete = incomplete;
        this.clear = clear;
        this.interval = interval || 16;
        this.display = display || ':title :percent :bar :time :completed/:total';
    }
    render(completed, options = {
    }) {
        if (!isTTY) return;
        completed = +completed;
        if (!Number.isInteger(completed)) throw new Error(`completed must be 'number'`);
        if (completed < 0) throw new Error(`completed must greater than or equal to 0`);
        const total1 = options.total || this.total;
        if (total1 === undefined) throw new Error(`total required`);
        if (!Number.isInteger(total1)) throw new Error(`total must be 'number'`);
        if (this.isCompleted) console.warn('Called after the end');
        const now = Date.now();
        const ms = now - this.lastRender;
        if (ms < this.interval && completed < total1) return;
        this.lastRender = now;
        this.time = ((now - this.start) / 1000).toFixed(1) + 's';
        const percent = (completed / total1 * 100).toFixed(2) + '%';
        let str = this.display.replace(':title', options.title || this.title).replace(':time', this.time).replace(':percent', percent).replace(':completed', completed + '').replace(':total', total1 + '');
        let availableSpace = Math.max(0, this.ttyColumns - str.replace(':bar', '').length);
        if (availableSpace && isWindow) availableSpace -= 1;
        const width1 = Math.min(this.width, availableSpace);
        const completeLength = Math.round(width1 * completed / total1);
        const complete1 = new Array(completeLength).fill(options.complete || this.complete).join('');
        const incomplete1 = new Array(width1 - completeLength).fill(options.incomplete || this.incomplete).join('');
        str = str.replace(':bar', complete1 + incomplete1);
        if (this.lastStr !== str) {
            this.write(str);
            this.lastStr = str;
        }
        if (completed >= total1) this.end();
    }
    end() {
        this.isCompleted = true;
        if (this.clear) {
            this.stdoutWrite('\r');
            this.clearLine();
        }
        this.showCursor();
    }
    console(message) {
        this.clearLine();
        this.write(`${message}`);
        this.breakLine();
        this.write(this.lastStr);
    }
    write(msg) {
        msg = `\r${msg}\x1b[?25l`;
        this.stdoutWrite(msg);
    }
    get ttyColumns() {
        return 100;
    }
    breakLine() {
        this.stdoutWrite('\r\n');
    }
    stdoutWrite(msg) {
        Deno.writeAllSync(Deno.stdout, this.encoder.encode(msg));
    }
    clearLine(direction = Direction.all) {
        switch(direction){
            case Direction.all:
                this.stdoutWrite('\x1b[2K');
                break;
            case Direction.left:
                this.stdoutWrite('\x1b[1K');
                break;
            case Direction.right:
                this.stdoutWrite('\x1b[0K');
                break;
        }
    }
    showCursor() {
        this.stdoutWrite('\x1b[?25h');
    }
}
const osType = (()=>{
    if (globalThis.Deno != null) {
        return Deno.build.os;
    }
    const navigator = globalThis.navigator;
    if (navigator?.appVersion?.includes?.("Win") ?? false) {
        return "windows";
    }
    return "linux";
})();
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function existsSync(filePath) {
    try {
        Deno.lstatSync(filePath);
        return true;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        }
        throw err;
    }
}
var EOL;
(function(EOL1) {
    EOL1["LF"] = "\n";
    EOL1["CRLF"] = "\r\n";
})(EOL || (EOL = {
}));
const esperance = (...values)=>{
    return values.reduce((prev, curr)=>prev + curr
    ) / values.length;
};
const variance = (...values)=>{
    return esperance(...values.map((value)=>value ** 2
    )) - esperance(...values) ** 2;
};
const covariance = (x, y)=>{
    return esperance(...x.map((xi, index)=>xi * y[index]
    )) - esperance(...x) * esperance(...y);
};
const coeffMoindre2 = (x, y)=>{
    const a = covariance(x, y) / variance(...x);
    const b = esperance(...y) - a * esperance(...x);
    return {
        a,
        b
    };
};
const incertitudesMoindre2 = (x, y)=>{
    const N = x.length;
    const Sx2 = x.reduce((prev, cur)=>prev + cur ** 2
    );
    const { a , b  } = coeffMoindre2(x, y);
    const sy = Math.sqrt(1 / (N - 2) * x.reduce((prev, _cur, index)=>prev + (y[index] - b - a * x[index]) ** 2
    ));
    const delta = x.length * x.reduce((prev, cur)=>prev + cur ** 2
    );
    const ua = 2 * Math.sqrt(sy * Math.sqrt(N / delta));
    const ub = 2 * Math.sqrt(sy * Math.sqrt(Sx2 / delta));
    return {
        ua,
        ub
    };
};
const r2 = (x, y)=>{
    const fX = coeffMoindre2(x, y);
    const fY = coeffMoindre2(y, x);
    return fX.a * fY.a;
};
const moindre2 = (x, y)=>{
    const { a , b  } = coeffMoindre2(x, y);
    const { ua , ub  } = incertitudesMoindre2(x, y);
    return {
        a,
        b,
        ua,
        ub,
        r2: r2(x, y)
    };
};
const extremum = (...values)=>{
    let min = values[0];
    let max = values[0];
    for (const value of values){
        min = value < min ? value : min;
        max = value > max ? value : max;
    }
    return [
        min,
        max
    ];
};
const mediane = (...values)=>{
    const sorted = values.sort((a, b)=>a - b
    );
    return sorted[Math.round(values.length / 2) - 1];
};
const parse = (...rawDatas)=>{
    const channels = [];
    const globalFocus = [];
    for (const rawData of rawDatas){
        const { amplitude , gain , focus  } = rawData;
        globalFocus.push(...focus);
        const unfilterChannels = rawData.channelEvent.data.map((channelData)=>({
                ...channelData,
                ...rawData.channelEvent.header,
                amplitude,
                gain
            })
        );
        channels.push(...unfilterChannels.filter((channelData)=>focus.includes(channelData.channel) || focus.includes(channelData.channel - 128)
        ));
    }
    const datas = [];
    for (const channelID of new Set(globalFocus)){
        const highGainDatas = channels.filter((channel)=>channel.channel === channelID + 128
        );
        const lowGainDatas = channels.filter((channel)=>channel.channel === channelID
        );
        const highTimestamp = extremum(...highGainDatas.map((channel)=>channel.fineTime
        ));
        const lowTimestamp = extremum(...lowGainDatas.map((channel)=>channel.fineTime
        ));
        const data = {
            channel: channelID,
            highGain: highGainDatas.map((channel)=>{
                return {
                    date: channel.timestamp,
                    timestamp: (channel.coarseTime + (channel.fineTime - highTimestamp[0]) / (highTimestamp[0] + highTimestamp[1])) * 25,
                    gain: channel.gain,
                    amplitude: channel.amplitude,
                    charge: channel.charge
                };
            }),
            lowGain: lowGainDatas.map((channel)=>{
                return {
                    date: channel.timestamp,
                    timestamp: (channel.coarseTime + (channel.fineTime - lowTimestamp[0]) / (lowTimestamp[0] + lowTimestamp[1])) * 25,
                    gain: channel.gain,
                    amplitude: channel.amplitude,
                    charge: channel.charge
                };
            })
        };
        datas.push(data);
    }
    return datas;
};
const byteArrayToDecimal = (byteArray)=>{
    let offset = 2 ** (byteArray.length + 1);
    let result = 0;
    for (const value of byteArray){
        result += offset > 4 ? value << offset : value;
        offset /= 2;
    }
    return result;
};
const hitRegisterHandle = (byteArray)=>{
    return new Array(...byteArray).map((e)=>e.toString(2).padStart(8, '0').split('')
    ).flat().map((e)=>parseInt(e)
    ).reverse().map((e, i)=>e * i
    ).filter((e)=>e != 0
    );
};
const parseChunk = (byteArray, format)=>{
    if (format === 'header') return {
        codeHeader: new Array(...byteArray.slice(0, 4)),
        timestamp: byteArrayToDecimal(byteArray.slice(4, 9)),
        recordedChannels: byteArray[9],
        hitRegister: hitRegisterHandle(new Uint8Array([
            ...byteArray.slice(19, 27),
            ...byteArray.slice(10, 18)
        ]))
    };
    if (format === 'channel') return {
        channel: byteArray[0],
        coarseTime: byteArrayToDecimal(byteArray.slice(1, 5)),
        fineTime: byteArrayToDecimal(byteArray.slice(7, 9)),
        charge: byteArrayToDecimal(byteArray.slice(5, 7))
    };
    throw new Error('Unknown data format');
};
const parseBin = async (path, forceFocus, listener)=>{
    const event = new Event('progressParseBin');
    if (listener !== undefined) globalThis.addEventListener('progressParseBin', listener);
    const datas = [];
    const file = await Deno.open(path);
    const { size  } = await file.stat();
    const focus = [
        ...forceFocus,
        parseInt((path.match(/Ch([0-9])+/g) ?? [
            '-1'
        ])[0].replace('Ch', ''))
    ];
    const amplitude = parseInt((path.match(/Amp([0-9])+/g) ?? [
        '-1'
    ])[0].replace('Amp', '')) / 10;
    const gain = parseInt((path.match(/G([0-9])+/g) ?? [
        '-1'
    ])[0].replace('G', ''));
    let progress = 0;
    while(size > progress){
        await Deno.seek(file.rid, 0, Deno.SeekMode.Current);
        const headerChunk = new Uint8Array(27);
        await file.read(headerChunk);
        if (JSON.stringify(headerChunk) === JSON.stringify(new Uint8Array(27).fill(0))) break;
        const header = parseChunk(headerChunk, 'header');
        progress += 27;
        if (listener !== undefined) {
            globalThis.dispatchEvent(event);
            globalThis.dispatchEvent(event);
            globalThis.dispatchEvent(event);
        }
        const channels = [];
        for (const _ of new Array(header.recordedChannels)){
            await Deno.seek(file.rid, 0, Deno.SeekMode.Current);
            const channelChunk = new Uint8Array(9);
            await file.read(channelChunk);
            if (JSON.stringify(channelChunk) === JSON.stringify(new Uint8Array(9).fill(0))) break;
            channels.push(parseChunk(channelChunk, 'channel'));
            progress += 9;
            if (listener !== undefined) globalThis.dispatchEvent(event);
        }
        const unknownChunk = new Uint8Array(9);
        const hiddenChannels = [];
        let isNotHeader = false;
        do {
            await Deno.seek(file.rid, 0, Deno.SeekMode.Current);
            await file.read(unknownChunk);
            isNotHeader = JSON.stringify(unknownChunk.slice(0, 4)) !== JSON.stringify(new Uint8Array([
                202,
                254,
                202,
                254
            ]));
            if (isNotHeader) {
                hiddenChannels.push(parseChunk(unknownChunk, 'channel'));
                progress += 9;
                if (listener !== undefined) globalThis.dispatchEvent(event);
            } else {
                await Deno.seek(file.rid, -9, Deno.SeekMode.Current);
                break;
            }
        }while (isNotHeader && size > progress)
        datas.push({
            focus: focus,
            amplitude: amplitude,
            gain: gain,
            channelEvent: {
                header: header,
                data: [
                    ...channels,
                    ...hiddenChannels.filter((channel)=>channel.coarseTime !== 0 && channel.channel !== 0
                    )
                ]
            }
        });
    }
    Deno.close(file.rid);
    return datas;
};
const parseSingle = async (directory, forceFocus, listener)=>{
    const event = new Event('progressParseSingle');
    if (listener !== undefined) globalThis.addEventListener('progressParseSingle', listener);
    const raws = [];
    for await (const dirEntry of Deno.readDir(directory)){
        if (dirEntry.isFile && dirEntry.name.endsWith('.bin')) {
            if (listener !== undefined) globalThis.dispatchEvent(event);
            raws.push(...await parseBin(`${directory}/${dirEntry.name}`, forceFocus));
        }
    }
    return raws.flat();
};
const parseAll = async (directory, forceFocus, listener)=>{
    const event = new Event('progressParseAll');
    if (listener !== undefined) globalThis.addEventListener('progressParseAll', listener);
    const raws = [];
    for await (const subDir of Deno.readDir(directory)){
        if (subDir.isDirectory && subDir.name.startsWith('TOBI')) {
            if (listener !== undefined) globalThis.dispatchEvent(event);
            raws.push(...await parseSingle(`${directory}/${subDir.name}`, forceFocus));
        }
    }
    return raws.flat();
};
const parseBin1 = async (sourcePath, outDir, prefix = 'raw_data', forcedChannels = [])=>{
    const absSourcePath = existsSync(sourcePath) ? sourcePath : `${Deno.cwd()}/${sourcePath}`;
    if (!existsSync(absSourcePath)) throw new Error(`No such file at ${absSourcePath}`);
    await Deno.mkdir(outDir, {
        recursive: true
    });
    const { isFile , isDirectory , size  } = await Deno.stat(absSourcePath);
    if (isFile) {
        const progress = new ProgressBar({
            total: size,
            clear: true
        });
        let comp = 0;
        const cb = (_e)=>progress.render(comp++)
        ;
        const rawData = await parseBin(absSourcePath, forcedChannels, cb);
        const jsonFile = JSON.stringify(rawData);
        await Deno.writeTextFile(`${outDir}/${prefix}_bin_ch${rawData[0].focus.join('_')}${Math.round(Math.random() * 100)}.json`, jsonFile);
        return;
    }
    if (isDirectory) {
        let count = 0;
        for await (const subDir of Deno.readDir(absSourcePath)){
            if (subDir.isDirectory) for await (const entry of Deno.readDir(subDir.name))if (entry.isFile && entry.name.endsWith('.bin')) count++;
            else if (subDir.isFile && subDir.name.endsWith('.bin')) count++;
        }
        const progress = new ProgressBar({
            total: count,
            clear: true
        });
        let comp = 0;
        for await (const subDir1 of Deno.readDir(absSourcePath)){
            if (subDir1.isDirectory) {
                const rawDatas = await parseSingle(absSourcePath, forcedChannels);
                if (rawDatas.length !== 0) {
                    const jsonFile = JSON.stringify(rawDatas);
                    await Deno.writeTextFile(`${outDir}/${prefix}_single_ch${rawDatas[0].focus.join('_')}${Math.round(Math.random() * 100)}.json`, jsonFile);
                    progress.render(comp++);
                }
            } else if (subDir1.isFile) {
                const rawData = await parseBin(absSourcePath, forcedChannels);
                const jsonFile = JSON.stringify(rawData);
                await Deno.writeTextFile(`${outDir}/${prefix}_single_bin_ch${rawData[0].focus.join('_')}${Math.round(Math.random() * 100)}.json`, jsonFile);
                progress.render(comp++);
            }
        }
        return;
    }
};
const parse1 = async (sourcePath, outFile)=>{
    const absSourcePath = existsSync(sourcePath) ? sourcePath : `${Deno.cwd()}/${sourcePath}`;
    if (!existsSync(absSourcePath)) throw new Error(`No such file at ${absSourcePath}`);
    await Deno.create(outFile);
    const progress = new ProgressBar({
        total: 128,
        clear: true
    });
    let comp = 0;
    const datas = [];
    const { isFile , isDirectory  } = await Deno.stat(absSourcePath);
    if (isFile) {
        const file = await Deno.readTextFile(sourcePath);
        datas.push(...parse(...JSON.parse(file)));
    } else if (isDirectory) {
        for await (const dirEntry of Deno.readDir(absSourcePath)){
            if (dirEntry.isFile && dirEntry.name.endsWith('.json')) {
                const file = await Deno.readTextFile(`${absSourcePath}/${dirEntry.name}`);
                datas.push(...parse(...JSON.parse(file)));
                progress.render(comp++);
            }
        }
    }
    await Deno.writeTextFile(outFile, JSON.stringify(datas));
};
const main = async (option, ...args)=>{
    if (option === '--parse-bin' || option === '-b') {
        const source = args[0];
        const output = args[args.indexOf('-o') + 1 || args.indexOf('--output') + 1 || -1] ?? './rawDatas';
        const prefix = args[args.indexOf('--prefix') + 1 || -1];
        const forcedChannels = JSON.parse(`[${args[args.indexOf('--forced') + 1 || -1] ?? ''}]`);
        await parseBin1(source, output, prefix, forcedChannels);
        return 0;
    }
    if (option === '--parse' || option === '-p') {
        const source = args[0];
        const output = args[1] === '-o' || args[1] === '--output' ? args[2] : './data.json';
        await parse1(source, output);
    }
    if (option === '--port' || option === undefined) {
        const port = parseInt(args[0]);
        return 0;
    }
    if (option === '--help' || option === '-h') {
        const help = await Deno.readTextFile('man.cli.txt');
        console.log(help);
        return 0;
    }
    return 1;
};
const [option, ...args] = Deno.args;
await main(option, ...args);
