/**
 * Calculate the esperance of a 1D set of values
 * @param {number[]} values Values to process on
 * @returns {number} Arithmetic mean of data set
 */
const esperance = (...values: number[]): number => {
    return values.reduce((prev, curr) => prev + curr, 0) / values.length
}

/**
 * Calculate the variance od 1D set of values
 * @param {number[]} values Values to process on
 * @returns {number} Variance of data set
 */
const variance = (...values: number[]): number => {
    return esperance(...values.map(value => value **2)) - esperance(...values) ** 2
}

/**
 * Calculate the covariance between 2 * 1D set of values
 * @param {number[]} x First values array
 * @param {number[]} y Second values array
 * @returns {number} Covariance between x and y
 */
const covariance = (x: number[], y: number[]): number => {
    return esperance(...x.map((xi, index) => xi * y[index])) - esperance(...x) * esperance(...y)
}

const coeffMoindre2 = (x: number[], y: number[]) => {
    const a = covariance(x, y) / variance(...x)
    const b = esperance(...y) - a * esperance(...x)
    return {a, b}
}

const incertitudesMoindre2 = (x: number[], y: number[]) => {
    const N = x.length
    //Somme carré
    const Sx2 = x.reduce((prev, cur) => prev + cur ** 2, 0)
    const {a, b} = coeffMoindre2(x, y)
    //Sigma sur y
    const sy = Math.sqrt((1 / (N - 2)) * x.reduce((prev, _cur, index) => 
        prev + (y[index] - b - a * x[index]) ** 2
    , 0))
    const delta = x.length * (x.reduce((prev, cur) => prev + cur ** 2, 0))
    const ua = 2 * Math.sqrt(sy * Math.sqrt(N / delta))
    const ub = 2 * Math.sqrt(sy * Math.sqrt(Sx2 / delta))
    return {ua, ub}
}

const r2 = (x: number[], y: number[]) => {
    const fX = coeffMoindre2(x, y)
    const fY = coeffMoindre2(y, x)
    return fX.a * fY.a
}

/**
 * Uses moindre² methode to linearize a 2D data set
 * @param {number} x First list of values
 * @param {number} y Second list of values
 * @param {boolean} intercept Allow intercept or force to 0, default true
 * @returns {Object} "a": slop, "b": intercept, "ua": incertitude on slop, "ub": incertitude on intercept, "r2": correlation coefficient
 */
const moindre2 = (x: number[], y: number[], intercept = true) => {
    if (!intercept) {
        const [a, b] = [esperance(...y) / esperance(...x), 0]
        const [ua, ub] = [2 * Math.sqrt(variance(...x.map((e, i) => y[i] - a * e))), 0]
        return {a, b, ua, ub, r2: r2(x, y)}
    }
    
    const {a, b} = coeffMoindre2(x, y)
    const {ua, ub} = incertitudesMoindre2(x, y)
    return {a, b, ua, ub, r2: r2(x, y)}
}

/**
 * Determine the min and the max of 1D array
 * @param {number[]} values Values to process on
 * @returns {number[]} [minimum value, maximum value]
 */
const extremum = (...values: number[]): number[] => {
    let min = values[0]
    let max = values[0]
    for(const value of values) {
        min = value < min ? value : min
        max = value > max ? value : max
    }
    return [min, max]
}

/**
 * Determine the mediane of 1D array
 * @param {number[]} values Values to process on
 * @returns {number} At least the middle index of sorted values
 */
const mediane = (...values: number[]): number => {
    const sorted = values.sort((a, b) => a - b)
    return sorted[Math.round(values.length / 2) - 1]
}

export {esperance, variance, covariance, moindre2, extremum, mediane}