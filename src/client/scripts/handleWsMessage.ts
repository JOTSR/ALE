/**
 * Handle event data from ws communication with server
 * @param messageString ws event data
 * @returns payload if necessary
 */
const handleWsMessage = (messageString: string) => {
    const message = JSON.parse(messageString)
    
    //Echo test
    if (message.type === 'echo') return {type: 'info', payload: message.payload}
    
    //Debug log
    if (message.type === 'info') {
        console.log(`[ws]: ${message.payload}`)
        return
    }
    
    //Response for parse bin datas (ABC)
    if (message.type === 'abc') {
        return {type: 'abc', payload: message.payload}
    }

    //Response for parse dat datas (GENE)
    if (message.type === 'gene') {
        return {type: 'gene', payload: message.payload}
    }

    throw new Error(`Unknown message type: ${messageString}`)    
}

export { handleWsMessage }