/*

*  -- Jacob Bogers, JS port, 03/2018, jkfbogers@gmail.com
*  -- Reference BLAS level2 routine (version 3.7.0) --
*  -- Reference BLAS is a software package provided by Univ. of Tennessee,    --
*  -- Univ. of California Berkeley, Univ. of Colorado Denver and NAG Ltd..--
*     December 2016
*/

/*
*>
*> CGERC  performs the rank 1 operation
*>
*>    A := alpha*x*y**H + A,
*>
*> where alpha is a scalar, x is an m element vector, y is an n element
*> vector and A is an m by n matrix.
*/

import { Complex, errMissingIm, errWrongArg, FortranArr, Matrix } from '../../f_func';

const { max, min } = Math;

export function chbmv(
    _uplo: 'u' | 'l',
    n: number,
    k: number,
    alpha: Complex,
    a: Matrix,
    lda: number,
    x: FortranArr,
    incx: number,
    beta: Complex,
    y: FortranArr,
    incy: number
): void {


    if (a.i === undefined) {
        throw new Error(errMissingIm('a.i'));
    }
    if (x.i === undefined) {
        throw new Error(errMissingIm('x.i'));
    }

    if (y.i === undefined) {
        throw new Error(errMissingIm('y.i'));
    }

    const ul = String.fromCharCode(_uplo.charCodeAt(0) | 0x20);

    let info = 0;

    if (ul !== 'u' && ul !== 'l') {
        info = 1;
    }
    else if (n < 0) {
        info = 2;
    }
    else if (k < 0) {
        info = 3;
    }
    else if (lda < (k + 1)) {
        info = 6;
    }
    else if (incx === 0) {
        info = 8;
    }
    else if (incy === 0) {
        info = 11;
    }

    if (info !== 0) {
        throw new Error(errWrongArg('chbmv', info));
    }

    const { re: AlphaRe, im: AlphaIm } = alpha;
    const { re: BetaRe, im: BetaIm } = beta;

    const alphaIsZero = AlphaRe === 0 && AlphaIm === 0;
    const betaIsOne = BetaRe === 1 && BetaIm === 0;
    const betaIsZero = BetaRe === 0 && BetaIm === 0;

    if (n === 0 || (alphaIsZero && betaIsOne)) return;

    let kx = incx > 0 ? 1 : 1 - (n - 1) * incx;
    let ky = incy > 0 ? 1 : 1 - (n - 1) * incy;

    if (betaIsOne) {
        let iy = ky;
        if (betaIsZero && incy === 1) {
            y.r.fill(0);
            y.i.fill(0);
        }
        else {
            for (let i = 1; i <= n; i++) {
                y.r[iy] = betaIsZero ? 0 : BetaRe * y.r[iy] - BetaIm * y.i[iy];
                y.i[iy] = betaIsZero ? 0 : BetaRe * y.i[iy] + BetaIm * y.r[iy];
                iy += incy;
            }
        }
    }
    if (alphaIsZero) return;

    let jx = kx - x.base;
    let jy = ky - y.base;

    if (ul === 'u') {
        let kplus1 = k + 1;
        for (let j = 1; j <= n; j++) {
            let temp1Re = AlphaRe * x.r[jx] - AlphaIm * x.i[jx];
            let temp1Im = AlphaRe * x.i[jx] + AlphaIm * x.r[jx];

            let temp2Re = 0;
            let temp2Im = 0;

            let ix = kx - x.base;
            let iy = ky - y.base;

            let L = kplus1 - j;
            let coords = a.colOfEx(j);
            for (let i = max(1, j - k); i <= j - 1; i++) {
                y.r[iy] += temp1Re * a.r[coords + L + i] - temp1Im * a.i[coords + L + i];
                y.i[iy] += temp1Re * a.i[coords + L + i] + temp1Im * a.r[coords + L + i];
                // conjugate
                temp2Re += a.r[coords + L + i] * x.r[ix] + a.i[coords + L + i] * x.i[ix];
                temp2Im += a.r[coords + L + i] * x.i[ix] - a.i[coords + L + i] * x.r[ix];
                ix += incx;
                iy += incy;
            }
            y.r[iy] += temp1Re * a.r[coords + kplus1] + (AlphaRe * temp2Re - AlphaIm * temp2Im);
            y.i[iy] += temp1Im * a.r[coords + kplus1] + (AlphaRe * temp2Im + AlphaIm * temp2Re);

            jx += incx;
            jy += incy;
            if (j > k) {
                kx += incx;
                ky += incy;
            }
        }
    }
    else {

        for (let j = 1; j <= n; j++) {
            let temp1Re = AlphaRe * x.r[jx] - AlphaIm * x.i[jx];
            let temp1Im = AlphaRe * x.i[jx] + AlphaIm * x.r[jx];

            let temp2Re = 0;
            let temp2Im = 0;

            const coords = a.colOfEx(j);
            y.r[jy] += temp1Re * a.r[coords + 1];
            y.i[jy] += temp1Im * a.r[coords + 1];

            let L = 1 - j;
            let ix = jx;
            let iy = jy;

            for (let i = j + 1; i <= min(n, j + k); i++) {
                ix += incx;
                iy += incy;

                y.r[iy] += temp1Re * a.r[coords + L + i] - temp1Im * a.i[coords + L + i];
                y.i[iy] += temp1Re * a.i[coords + L + i] + temp1Im * a.r[coords + L + i];

                // conjugate!!!
                temp2Re += a.r[coords + L + i] * x.r[ix] + a.i[coords + L + i] * x.i[ix];
                temp2Im += a.r[coords + L + i] * x.i[ix] - a.i[coords + L + i] * x.r[ix];
            }
            y.r[jy] += AlphaRe * temp2Re - AlphaIm * temp2Im;
            y.i[jy] += AlphaRe * temp2Im + AlphaIm * temp2Re;

            jx += incx;
            jy += incy;
        }
    }
}
