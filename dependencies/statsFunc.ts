/**
 * Calculate the esperance of a 1D set of values
 * @param values Values to process on
 * @returns Arithmetic mean of data set
 */
const esperance = (...values: number[]) => {
    return values.reduce((prev, curr) => prev + curr) / values.length
}

/**
 * Calculate the variance od 1D set of values
 * @param values Values to process on
 * @returns Variance of data set
 */
const variance = (...values: number[]) => {
    return esperance(...values.map(value => value **2)) - esperance(...values) ** 2
}

/**
 * Calculate the covariance between 2 * 1D set of values
 * @param x First values array
 * @param y Second values array
 * @returns Covariance between x and y
 */
const covariance = (x: number[], y: number[]) => {
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
    const Sx2 = x.reduce((prev, cur) => prev + cur ** 2)
    const {a, b} = coeffMoindre2(x, y)
    //Sigma sur y
    const sy = Math.sqrt((1 / (N - 2)) * x.reduce((prev, _cur, index) => 
        prev + (y[index] - b - a * x[index]) ** 2
    ))
    const delta = x.length * (x.reduce((prev, cur) => prev + cur ** 2))
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
 * @param x First list of values
 * @param y Second list of values
 * @returns a: slop, b: intercept, ua: incertitude on slop, ub: incertitude on intercept, r2: correlation coefficient
 */
const moindre2 = (x: number[], y: number[]) => {
    const {a, b} = coeffMoindre2(x, y)
    const {ua, ub} = incertitudesMoindre2(x, y)
    return {a, b, ua, ub, r2: r2(x, y)}
}

/**
 * Determine the min and the max of 1D array
 * @param values Values to process on
 * @returns [minimum value, maximum value]
 */
const extremum = (...values: number[]) => {
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
 * @param values Values to process on
 * @returns At least the middle index of sorted values
 */
const mediane = (...values: number[]) => {
    const sorted = values.sort((a, b) => a - b)
    return sorted[Math.round(values.length / 2) - 1]
}

export {esperance, variance, covariance, moindre2, r2, extremum, mediane}