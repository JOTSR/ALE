import { handleWsMessage } from './handleWsMessage.ts'
import { Data } from '../../../dependencies/abcAdapter.ts'
import * as GENE from '../../../dependencies/geneAdapter.ts'
import * as STATS from '../../../dependencies/statsFunc.ts'
const ws = new WebSocket('ws://localhost:3000')

let data: Data[]
let geneData: GENE.Data[]

//Websocket communication
ws.onerror = (e) => {
	console.error(`[ws]: ${e}`)
}

ws.onopen = (_) => {
	console.log(`[ws]: Connected to ws://localhost:3000`)
	const message = { type: 'echo', payload: 'ready' }
	ws.send(JSON.stringify(message))
}

ws.onmessage = (e) => {
	const response = handleWsMessage(e.data)
	//MAJ de abc data
	if (response?.type === 'abc') data = response?.payload
	//MAJ de gene data
	if (response?.type === 'gene') geneData = response?.payload
	//For debug
	if (response !== undefined)
		ws.send(JSON.stringify({ type: 'info', payload: 'client recived' }))
}

/**
 * Shortcut for querySelector / querySelectorAll
 * @param selector HTML slector
 * @returns Targeted HTMLElement(s)
 */
const $ = (selector: string): HTMLElement | HTMLElement[] => {
	const elements = document.querySelectorAll(selector)
	if (elements.length === 1) return elements[0]
	return Array.from(elements)
}

//Select menu
const menuButtons = $('#abc-tabs>button')
menuButtons.forEach((button) => {
	button.addEventListener('click', () => {
		menuButtons.forEach((e) => {
			e.classList.remove('active')
			if (e.value !== '') $(`#${e.value}`).style.display = 'none'
		})
		button.classList.add('active')
		if (button.value !== '') $(`#${button.value}`).style.display = 'block'
	})
})

const jsonAutoDownload = (data: unknown, fileName: string) => {
	const json = JSON.stringify(data)
	const uri = encodeURI(json)
	const link = document.createElement('a')
	link.setAttribute('href', uri)
	console.log(uri)
	link.setAttribute('download', fileName)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

/**
 * Etalonnage carte ABC et Gene
 */

const loadButton = $('#load-button')
const folderPath = $('#folder-path')
const forcedFocus = $('#forced-focus')
const exportData = $('#export-data')

loadButton.addEventListener('click', () => {
	if (loadButton.value === 'abc') {
		//Store forced channel string into number[]
		const forcedFocusValues = forcedFocus.value
			?.split(',')
			?.map((e) => parseInt(e) ?? [])

		ws.send(
			JSON.stringify({
				type: 'abc',
				payload: {
					path: folderPath.value,
					forcedFocus: forcedFocusValues,
				},
			})
		)
	}
	if (loadButton.value === 'gene') {
		ws.send(
			JSON.stringify({
				type: 'gene',
				payload: {
					path: folderPath.value,
					config: { width: 10, rise: 5, fall: 5 },
				},
			})
		)
	}
})

exportData.addEventListener('click', () => {
	//export to json file in future or copy in clipboard
	if (exportData.value === 'abc') jsonAutoDownload(data, 'abc.json')
	if (exportData.value === 'gene') jsonAutoDownload(geneData, 'gene.json')
})

if (window.location.pathname === '/gene') {
	$('#trace-graph').addEventListener('click', () => {
		const sortedGene = geneData.sort(
			(prev, cur) => prev.voltage - cur.voltage
		)

		const trace = {
			x: sortedGene.map((e) => e.voltage),
			y: sortedGene.map((e) => e.mean),
			error_y: {
				type: 'data',
				array: sortedGene.map((e) => e.sigma),
				visible: true,
			},
			type: 'scatter',
		}

		const data = [trace]

		const layout = {
			title: 'Étalonnage générateur',
			showlegend: false,
			xaxis: {
				title: 'Tension (mV)',
			},
			yaxis: {
				title: 'Charge (pC)',
			},
		}

		//Global function if html
		Graph('gene-graph', data, layout, { scrollZoom: true, editable: true })

		//Linear fit "meanCharge = f(voltage)"
		const stats = STATS.moindre2(
			sortedGene.map((e) => e.voltage),
			sortedGene.map((e) => e.mean)
		)

		//Prettify json
		$('#gene-stats').innerText = JSON.stringify(stats)
			.replaceAll('{', '{\n')
			.replaceAll('}', '\n}')
			.replaceAll(',"', ',\n"')
	})
}
