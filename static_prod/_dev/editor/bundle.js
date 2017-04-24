(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* big.js v3.1.3 https://github.com/MikeMcl/big.js/LICENCE */
;(function (global) {
    'use strict';

/*
  big.js v3.1.3
  A small, fast, easy-to-use library for arbitrary-precision decimal arithmetic.
  https://github.com/MikeMcl/big.js/
  Copyright (c) 2014 Michael Mclaughlin <M8ch88l@gmail.com>
  MIT Expat Licence
*/

/***************************** EDITABLE DEFAULTS ******************************/

    // The default values below must be integers within the stated ranges.

    /*
     * The maximum number of decimal places of the results of operations
     * involving division: div and sqrt, and pow with negative exponents.
     */
    var DP = 20,                           // 0 to MAX_DP

        /*
         * The rounding mode used when rounding to the above decimal places.
         *
         * 0 Towards zero (i.e. truncate, no rounding).       (ROUND_DOWN)
         * 1 To nearest neighbour. If equidistant, round up.  (ROUND_HALF_UP)
         * 2 To nearest neighbour. If equidistant, to even.   (ROUND_HALF_EVEN)
         * 3 Away from zero.                                  (ROUND_UP)
         */
        RM = 1,                            // 0, 1, 2 or 3

        // The maximum value of DP and Big.DP.
        MAX_DP = 1E6,                      // 0 to 1000000

        // The maximum magnitude of the exponent argument to the pow method.
        MAX_POWER = 1E6,                   // 1 to 1000000

        /*
         * The exponent value at and beneath which toString returns exponential
         * notation.
         * JavaScript's Number type: -7
         * -1000000 is the minimum recommended exponent value of a Big.
         */
        E_NEG = -7,                   // 0 to -1000000

        /*
         * The exponent value at and above which toString returns exponential
         * notation.
         * JavaScript's Number type: 21
         * 1000000 is the maximum recommended exponent value of a Big.
         * (This limit is not enforced or checked.)
         */
        E_POS = 21,                   // 0 to 1000000

/******************************************************************************/

        // The shared prototype object.
        P = {},
        isValid = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,
        Big;


    /*
     * Create and return a Big constructor.
     *
     */
    function bigFactory() {

        /*
         * The Big constructor and exported function.
         * Create and return a new instance of a Big number object.
         *
         * n {number|string|Big} A numeric value.
         */
        function Big(n) {
            var x = this;

            // Enable constructor usage without new.
            if (!(x instanceof Big)) {
                return n === void 0 ? bigFactory() : new Big(n);
            }

            // Duplicate.
            if (n instanceof Big) {
                x.s = n.s;
                x.e = n.e;
                x.c = n.c.slice();
            } else {
                parse(x, n);
            }

            /*
             * Retain a reference to this Big constructor, and shadow
             * Big.prototype.constructor which points to Object.
             */
            x.constructor = Big;
        }

        Big.prototype = P;
        Big.DP = DP;
        Big.RM = RM;
        Big.E_NEG = E_NEG;
        Big.E_POS = E_POS;

        return Big;
    }


    // Private functions


    /*
     * Return a string representing the value of Big x in normal or exponential
     * notation to dp fixed decimal places or significant digits.
     *
     * x {Big} The Big to format.
     * dp {number} Integer, 0 to MAX_DP inclusive.
     * toE {number} 1 (toExponential), 2 (toPrecision) or undefined (toFixed).
     */
    function format(x, dp, toE) {
        var Big = x.constructor,

            // The index (normal notation) of the digit that may be rounded up.
            i = dp - (x = new Big(x)).e,
            c = x.c;

        // Round?
        if (c.length > ++dp) {
            rnd(x, i, Big.RM);
        }

        if (!c[0]) {
            ++i;
        } else if (toE) {
            i = dp;

        // toFixed
        } else {
            c = x.c;

            // Recalculate i as x.e may have changed if value rounded up.
            i = x.e + i + 1;
        }

        // Append zeros?
        for (; c.length < i; c.push(0)) {
        }
        i = x.e;

        /*
         * toPrecision returns exponential notation if the number of
         * significant digits specified is less than the number of digits
         * necessary to represent the integer part of the value in normal
         * notation.
         */
        return toE === 1 || toE && (dp <= i || i <= Big.E_NEG) ?

          // Exponential notation.
          (x.s < 0 && c[0] ? '-' : '') +
            (c.length > 1 ? c[0] + '.' + c.join('').slice(1) : c[0]) +
              (i < 0 ? 'e' : 'e+') + i

          // Normal notation.
          : x.toString();
    }


    /*
     * Parse the number or string value passed to a Big constructor.
     *
     * x {Big} A Big number instance.
     * n {number|string} A numeric value.
     */
    function parse(x, n) {
        var e, i, nL;

        // Minus zero?
        if (n === 0 && 1 / n < 0) {
            n = '-0';

        // Ensure n is string and check validity.
        } else if (!isValid.test(n += '')) {
            throwErr(NaN);
        }

        // Determine sign.
        x.s = n.charAt(0) == '-' ? (n = n.slice(1), -1) : 1;

        // Decimal point?
        if ((e = n.indexOf('.')) > -1) {
            n = n.replace('.', '');
        }

        // Exponential form?
        if ((i = n.search(/e/i)) > 0) {

            // Determine exponent.
            if (e < 0) {
                e = i;
            }
            e += +n.slice(i + 1);
            n = n.substring(0, i);

        } else if (e < 0) {

            // Integer.
            e = n.length;
        }

        // Determine leading zeros.
        for (i = 0; n.charAt(i) == '0'; i++) {
        }

        if (i == (nL = n.length)) {

            // Zero.
            x.c = [ x.e = 0 ];
        } else {

            // Determine trailing zeros.
            for (; n.charAt(--nL) == '0';) {
            }

            x.e = e - i - 1;
            x.c = [];

            // Convert string to array of digits without leading/trailing zeros.
            for (e = 0; i <= nL; x.c[e++] = +n.charAt(i++)) {
            }
        }

        return x;
    }


    /*
     * Round Big x to a maximum of dp decimal places using rounding mode rm.
     * Called by div, sqrt and round.
     *
     * x {Big} The Big to round.
     * dp {number} Integer, 0 to MAX_DP inclusive.
     * rm {number} 0, 1, 2 or 3 (DOWN, HALF_UP, HALF_EVEN, UP)
     * [more] {boolean} Whether the result of division was truncated.
     */
    function rnd(x, dp, rm, more) {
        var u,
            xc = x.c,
            i = x.e + dp + 1;

        if (rm === 1) {

            // xc[i] is the digit after the digit that may be rounded up.
            more = xc[i] >= 5;
        } else if (rm === 2) {
            more = xc[i] > 5 || xc[i] == 5 &&
              (more || i < 0 || xc[i + 1] !== u || xc[i - 1] & 1);
        } else if (rm === 3) {
            more = more || xc[i] !== u || i < 0;
        } else {
            more = false;

            if (rm !== 0) {
                throwErr('!Big.RM!');
            }
        }

        if (i < 1 || !xc[0]) {

            if (more) {

                // 1, 0.1, 0.01, 0.001, 0.0001 etc.
                x.e = -dp;
                x.c = [1];
            } else {

                // Zero.
                x.c = [x.e = 0];
            }
        } else {

            // Remove any digits after the required decimal places.
            xc.length = i--;

            // Round up?
            if (more) {

                // Rounding up may mean the previous digit has to be rounded up.
                for (; ++xc[i] > 9;) {
                    xc[i] = 0;

                    if (!i--) {
                        ++x.e;
                        xc.unshift(1);
                    }
                }
            }

            // Remove trailing zeros.
            for (i = xc.length; !xc[--i]; xc.pop()) {
            }
        }

        return x;
    }


    /*
     * Throw a BigError.
     *
     * message {string} The error message.
     */
    function throwErr(message) {
        var err = new Error(message);
        err.name = 'BigError';

        throw err;
    }


    // Prototype/instance methods


    /*
     * Return a new Big whose value is the absolute value of this Big.
     */
    P.abs = function () {
        var x = new this.constructor(this);
        x.s = 1;

        return x;
    };


    /*
     * Return
     * 1 if the value of this Big is greater than the value of Big y,
     * -1 if the value of this Big is less than the value of Big y, or
     * 0 if they have the same value.
    */
    P.cmp = function (y) {
        var xNeg,
            x = this,
            xc = x.c,
            yc = (y = new x.constructor(y)).c,
            i = x.s,
            j = y.s,
            k = x.e,
            l = y.e;

        // Either zero?
        if (!xc[0] || !yc[0]) {
            return !xc[0] ? !yc[0] ? 0 : -j : i;
        }

        // Signs differ?
        if (i != j) {
            return i;
        }
        xNeg = i < 0;

        // Compare exponents.
        if (k != l) {
            return k > l ^ xNeg ? 1 : -1;
        }

        i = -1;
        j = (k = xc.length) < (l = yc.length) ? k : l;

        // Compare digit by digit.
        for (; ++i < j;) {

            if (xc[i] != yc[i]) {
                return xc[i] > yc[i] ^ xNeg ? 1 : -1;
            }
        }

        // Compare lengths.
        return k == l ? 0 : k > l ^ xNeg ? 1 : -1;
    };


    /*
     * Return a new Big whose value is the value of this Big divided by the
     * value of Big y, rounded, if necessary, to a maximum of Big.DP decimal
     * places using rounding mode Big.RM.
     */
    P.div = function (y) {
        var x = this,
            Big = x.constructor,
            // dividend
            dvd = x.c,
            //divisor
            dvs = (y = new Big(y)).c,
            s = x.s == y.s ? 1 : -1,
            dp = Big.DP;

        if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
            throwErr('!Big.DP!');
        }

        // Either 0?
        if (!dvd[0] || !dvs[0]) {

            // If both are 0, throw NaN
            if (dvd[0] == dvs[0]) {
                throwErr(NaN);
            }

            // If dvs is 0, throw +-Infinity.
            if (!dvs[0]) {
                throwErr(s / 0);
            }

            // dvd is 0, return +-0.
            return new Big(s * 0);
        }

        var dvsL, dvsT, next, cmp, remI, u,
            dvsZ = dvs.slice(),
            dvdI = dvsL = dvs.length,
            dvdL = dvd.length,
            // remainder
            rem = dvd.slice(0, dvsL),
            remL = rem.length,
            // quotient
            q = y,
            qc = q.c = [],
            qi = 0,
            digits = dp + (q.e = x.e - y.e) + 1;

        q.s = s;
        s = digits < 0 ? 0 : digits;

        // Create version of divisor with leading zero.
        dvsZ.unshift(0);

        // Add zeros to make remainder as long as divisor.
        for (; remL++ < dvsL; rem.push(0)) {
        }

        do {

            // 'next' is how many times the divisor goes into current remainder.
            for (next = 0; next < 10; next++) {

                // Compare divisor and remainder.
                if (dvsL != (remL = rem.length)) {
                    cmp = dvsL > remL ? 1 : -1;
                } else {

                    for (remI = -1, cmp = 0; ++remI < dvsL;) {

                        if (dvs[remI] != rem[remI]) {
                            cmp = dvs[remI] > rem[remI] ? 1 : -1;
                            break;
                        }
                    }
                }

                // If divisor < remainder, subtract divisor from remainder.
                if (cmp < 0) {

                    // Remainder can't be more than 1 digit longer than divisor.
                    // Equalise lengths using divisor with extra leading zero?
                    for (dvsT = remL == dvsL ? dvs : dvsZ; remL;) {

                        if (rem[--remL] < dvsT[remL]) {
                            remI = remL;

                            for (; remI && !rem[--remI]; rem[remI] = 9) {
                            }
                            --rem[remI];
                            rem[remL] += 10;
                        }
                        rem[remL] -= dvsT[remL];
                    }
                    for (; !rem[0]; rem.shift()) {
                    }
                } else {
                    break;
                }
            }

            // Add the 'next' digit to the result array.
            qc[qi++] = cmp ? next : ++next;

            // Update the remainder.
            if (rem[0] && cmp) {
                rem[remL] = dvd[dvdI] || 0;
            } else {
                rem = [ dvd[dvdI] ];
            }

        } while ((dvdI++ < dvdL || rem[0] !== u) && s--);

        // Leading zero? Do not remove if result is simply zero (qi == 1).
        if (!qc[0] && qi != 1) {

            // There can't be more than one zero.
            qc.shift();
            q.e--;
        }

        // Round?
        if (qi > digits) {
            rnd(q, dp, Big.RM, rem[0] !== u);
        }

        return q;
    };


    /*
     * Return true if the value of this Big is equal to the value of Big y,
     * otherwise returns false.
     */
    P.eq = function (y) {
        return !this.cmp(y);
    };


    /*
     * Return true if the value of this Big is greater than the value of Big y,
     * otherwise returns false.
     */
    P.gt = function (y) {
        return this.cmp(y) > 0;
    };


    /*
     * Return true if the value of this Big is greater than or equal to the
     * value of Big y, otherwise returns false.
     */
    P.gte = function (y) {
        return this.cmp(y) > -1;
    };


    /*
     * Return true if the value of this Big is less than the value of Big y,
     * otherwise returns false.
     */
    P.lt = function (y) {
        return this.cmp(y) < 0;
    };


    /*
     * Return true if the value of this Big is less than or equal to the value
     * of Big y, otherwise returns false.
     */
    P.lte = function (y) {
         return this.cmp(y) < 1;
    };


    /*
     * Return a new Big whose value is the value of this Big minus the value
     * of Big y.
     */
    P.sub = P.minus = function (y) {
        var i, j, t, xLTy,
            x = this,
            Big = x.constructor,
            a = x.s,
            b = (y = new Big(y)).s;

        // Signs differ?
        if (a != b) {
            y.s = -b;
            return x.plus(y);
        }

        var xc = x.c.slice(),
            xe = x.e,
            yc = y.c,
            ye = y.e;

        // Either zero?
        if (!xc[0] || !yc[0]) {

            // y is non-zero? x is non-zero? Or both are zero.
            return yc[0] ? (y.s = -b, y) : new Big(xc[0] ? x : 0);
        }

        // Determine which is the bigger number.
        // Prepend zeros to equalise exponents.
        if (a = xe - ye) {

            if (xLTy = a < 0) {
                a = -a;
                t = xc;
            } else {
                ye = xe;
                t = yc;
            }

            t.reverse();
            for (b = a; b--; t.push(0)) {
            }
            t.reverse();
        } else {

            // Exponents equal. Check digit by digit.
            j = ((xLTy = xc.length < yc.length) ? xc : yc).length;

            for (a = b = 0; b < j; b++) {

                if (xc[b] != yc[b]) {
                    xLTy = xc[b] < yc[b];
                    break;
                }
            }
        }

        // x < y? Point xc to the array of the bigger number.
        if (xLTy) {
            t = xc;
            xc = yc;
            yc = t;
            y.s = -y.s;
        }

        /*
         * Append zeros to xc if shorter. No need to add zeros to yc if shorter
         * as subtraction only needs to start at yc.length.
         */
        if (( b = (j = yc.length) - (i = xc.length) ) > 0) {

            for (; b--; xc[i++] = 0) {
            }
        }

        // Subtract yc from xc.
        for (b = i; j > a;){

            if (xc[--j] < yc[j]) {

                for (i = j; i && !xc[--i]; xc[i] = 9) {
                }
                --xc[i];
                xc[j] += 10;
            }
            xc[j] -= yc[j];
        }

        // Remove trailing zeros.
        for (; xc[--b] === 0; xc.pop()) {
        }

        // Remove leading zeros and adjust exponent accordingly.
        for (; xc[0] === 0;) {
            xc.shift();
            --ye;
        }

        if (!xc[0]) {

            // n - n = +0
            y.s = 1;

            // Result must be zero.
            xc = [ye = 0];
        }

        y.c = xc;
        y.e = ye;

        return y;
    };


    /*
     * Return a new Big whose value is the value of this Big modulo the
     * value of Big y.
     */
    P.mod = function (y) {
        var yGTx,
            x = this,
            Big = x.constructor,
            a = x.s,
            b = (y = new Big(y)).s;

        if (!y.c[0]) {
            throwErr(NaN);
        }

        x.s = y.s = 1;
        yGTx = y.cmp(x) == 1;
        x.s = a;
        y.s = b;

        if (yGTx) {
            return new Big(x);
        }

        a = Big.DP;
        b = Big.RM;
        Big.DP = Big.RM = 0;
        x = x.div(y);
        Big.DP = a;
        Big.RM = b;

        return this.minus( x.times(y) );
    };


    /*
     * Return a new Big whose value is the value of this Big plus the value
     * of Big y.
     */
    P.add = P.plus = function (y) {
        var t,
            x = this,
            Big = x.constructor,
            a = x.s,
            b = (y = new Big(y)).s;

        // Signs differ?
        if (a != b) {
            y.s = -b;
            return x.minus(y);
        }

        var xe = x.e,
            xc = x.c,
            ye = y.e,
            yc = y.c;

        // Either zero?
        if (!xc[0] || !yc[0]) {

            // y is non-zero? x is non-zero? Or both are zero.
            return yc[0] ? y : new Big(xc[0] ? x : a * 0);
        }
        xc = xc.slice();

        // Prepend zeros to equalise exponents.
        // Note: Faster to use reverse then do unshifts.
        if (a = xe - ye) {

            if (a > 0) {
                ye = xe;
                t = yc;
            } else {
                a = -a;
                t = xc;
            }

            t.reverse();
            for (; a--; t.push(0)) {
            }
            t.reverse();
        }

        // Point xc to the longer array.
        if (xc.length - yc.length < 0) {
            t = yc;
            yc = xc;
            xc = t;
        }
        a = yc.length;

        /*
         * Only start adding at yc.length - 1 as the further digits of xc can be
         * left as they are.
         */
        for (b = 0; a;) {
            b = (xc[--a] = xc[a] + yc[a] + b) / 10 | 0;
            xc[a] %= 10;
        }

        // No need to check for zero, as +x + +y != 0 && -x + -y != 0

        if (b) {
            xc.unshift(b);
            ++ye;
        }

         // Remove trailing zeros.
        for (a = xc.length; xc[--a] === 0; xc.pop()) {
        }

        y.c = xc;
        y.e = ye;

        return y;
    };


    /*
     * Return a Big whose value is the value of this Big raised to the power n.
     * If n is negative, round, if necessary, to a maximum of Big.DP decimal
     * places using rounding mode Big.RM.
     *
     * n {number} Integer, -MAX_POWER to MAX_POWER inclusive.
     */
    P.pow = function (n) {
        var x = this,
            one = new x.constructor(1),
            y = one,
            isNeg = n < 0;

        if (n !== ~~n || n < -MAX_POWER || n > MAX_POWER) {
            throwErr('!pow!');
        }

        n = isNeg ? -n : n;

        for (;;) {

            if (n & 1) {
                y = y.times(x);
            }
            n >>= 1;

            if (!n) {
                break;
            }
            x = x.times(x);
        }

        return isNeg ? one.div(y) : y;
    };


    /*
     * Return a new Big whose value is the value of this Big rounded to a
     * maximum of dp decimal places using rounding mode rm.
     * If dp is not specified, round to 0 decimal places.
     * If rm is not specified, use Big.RM.
     *
     * [dp] {number} Integer, 0 to MAX_DP inclusive.
     * [rm] 0, 1, 2 or 3 (ROUND_DOWN, ROUND_HALF_UP, ROUND_HALF_EVEN, ROUND_UP)
     */
    P.round = function (dp, rm) {
        var x = this,
            Big = x.constructor;

        if (dp == null) {
            dp = 0;
        } else if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
            throwErr('!round!');
        }
        rnd(x = new Big(x), dp, rm == null ? Big.RM : rm);

        return x;
    };


    /*
     * Return a new Big whose value is the square root of the value of this Big,
     * rounded, if necessary, to a maximum of Big.DP decimal places using
     * rounding mode Big.RM.
     */
    P.sqrt = function () {
        var estimate, r, approx,
            x = this,
            Big = x.constructor,
            xc = x.c,
            i = x.s,
            e = x.e,
            half = new Big('0.5');

        // Zero?
        if (!xc[0]) {
            return new Big(x);
        }

        // If negative, throw NaN.
        if (i < 0) {
            throwErr(NaN);
        }

        // Estimate.
        i = Math.sqrt(x.toString());

        // Math.sqrt underflow/overflow?
        // Pass x to Math.sqrt as integer, then adjust the result exponent.
        if (i === 0 || i === 1 / 0) {
            estimate = xc.join('');

            if (!(estimate.length + e & 1)) {
                estimate += '0';
            }

            r = new Big( Math.sqrt(estimate).toString() );
            r.e = ((e + 1) / 2 | 0) - (e < 0 || e & 1);
        } else {
            r = new Big(i.toString());
        }

        i = r.e + (Big.DP += 4);

        // Newton-Raphson iteration.
        do {
            approx = r;
            r = half.times( approx.plus( x.div(approx) ) );
        } while ( approx.c.slice(0, i).join('') !==
                       r.c.slice(0, i).join('') );

        rnd(r, Big.DP -= 4, Big.RM);

        return r;
    };


    /*
     * Return a new Big whose value is the value of this Big times the value of
     * Big y.
     */
    P.mul = P.times = function (y) {
        var c,
            x = this,
            Big = x.constructor,
            xc = x.c,
            yc = (y = new Big(y)).c,
            a = xc.length,
            b = yc.length,
            i = x.e,
            j = y.e;

        // Determine sign of result.
        y.s = x.s == y.s ? 1 : -1;

        // Return signed 0 if either 0.
        if (!xc[0] || !yc[0]) {
            return new Big(y.s * 0);
        }

        // Initialise exponent of result as x.e + y.e.
        y.e = i + j;

        // If array xc has fewer digits than yc, swap xc and yc, and lengths.
        if (a < b) {
            c = xc;
            xc = yc;
            yc = c;
            j = a;
            a = b;
            b = j;
        }

        // Initialise coefficient array of result with zeros.
        for (c = new Array(j = a + b); j--; c[j] = 0) {
        }

        // Multiply.

        // i is initially xc.length.
        for (i = b; i--;) {
            b = 0;

            // a is yc.length.
            for (j = a + i; j > i;) {

                // Current sum of products at this digit position, plus carry.
                b = c[j] + yc[i] * xc[j - i - 1] + b;
                c[j--] = b % 10;

                // carry
                b = b / 10 | 0;
            }
            c[j] = (c[j] + b) % 10;
        }

        // Increment result exponent if there is a final carry.
        if (b) {
            ++y.e;
        }

        // Remove any leading zero.
        if (!c[0]) {
            c.shift();
        }

        // Remove trailing zeros.
        for (i = c.length; !c[--i]; c.pop()) {
        }
        y.c = c;

        return y;
    };


    /*
     * Return a string representing the value of this Big.
     * Return exponential notation if this Big has a positive exponent equal to
     * or greater than Big.E_POS, or a negative exponent equal to or less than
     * Big.E_NEG.
     */
    P.toString = P.valueOf = P.toJSON = function () {
        var x = this,
            Big = x.constructor,
            e = x.e,
            str = x.c.join(''),
            strL = str.length;

        // Exponential notation?
        if (e <= Big.E_NEG || e >= Big.E_POS) {
            str = str.charAt(0) + (strL > 1 ? '.' + str.slice(1) : '') +
              (e < 0 ? 'e' : 'e+') + e;

        // Negative exponent?
        } else if (e < 0) {

            // Prepend zeros.
            for (; ++e; str = '0' + str) {
            }
            str = '0.' + str;

        // Positive exponent?
        } else if (e > 0) {

            if (++e > strL) {

                // Append zeros.
                for (e -= strL; e-- ; str += '0') {
                }
            } else if (e < strL) {
                str = str.slice(0, e) + '.' + str.slice(e);
            }

        // Exponent zero.
        } else if (strL > 1) {
            str = str.charAt(0) + '.' + str.slice(1);
        }

        // Avoid '-0'
        return x.s < 0 && x.c[0] ? '-' + str : str;
    };


    /*
     ***************************************************************************
     * If toExponential, toFixed, toPrecision and format are not required they
     * can safely be commented-out or deleted. No redundant code will be left.
     * format is used only by toExponential, toFixed and toPrecision.
     ***************************************************************************
     */


    /*
     * Return a string representing the value of this Big in exponential
     * notation to dp fixed decimal places and rounded, if necessary, using
     * Big.RM.
     *
     * [dp] {number} Integer, 0 to MAX_DP inclusive.
     */
    P.toExponential = function (dp) {

        if (dp == null) {
            dp = this.c.length - 1;
        } else if (dp !== ~~dp || dp < 0 || dp > MAX_DP) {
            throwErr('!toExp!');
        }

        return format(this, dp, 1);
    };


    /*
     * Return a string representing the value of this Big in normal notation
     * to dp fixed decimal places and rounded, if necessary, using Big.RM.
     *
     * [dp] {number} Integer, 0 to MAX_DP inclusive.
     */
    P.toFixed = function (dp) {
        var str,
            x = this,
            Big = x.constructor,
            neg = Big.E_NEG,
            pos = Big.E_POS;

        // Prevent the possibility of exponential notation.
        Big.E_NEG = -(Big.E_POS = 1 / 0);

        if (dp == null) {
            str = x.toString();
        } else if (dp === ~~dp && dp >= 0 && dp <= MAX_DP) {
            str = format(x, x.e + dp);

            // (-0).toFixed() is '0', but (-0.1).toFixed() is '-0'.
            // (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
            if (x.s < 0 && x.c[0] && str.indexOf('-') < 0) {
        //E.g. -0.5 if rounded to -0 will cause toString to omit the minus sign.
                str = '-' + str;
            }
        }
        Big.E_NEG = neg;
        Big.E_POS = pos;

        if (!str) {
            throwErr('!toFix!');
        }

        return str;
    };


    /*
     * Return a string representing the value of this Big rounded to sd
     * significant digits using Big.RM. Use exponential notation if sd is less
     * than the number of digits necessary to represent the integer part of the
     * value in normal notation.
     *
     * sd {number} Integer, 1 to MAX_DP inclusive.
     */
    P.toPrecision = function (sd) {

        if (sd == null) {
            return this.toString();
        } else if (sd !== ~~sd || sd < 1 || sd > MAX_DP) {
            throwErr('!toPre!');
        }

        return format(this, sd - 1, 2);
    };


    // Export


    Big = bigFactory();

    //AMD.
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return Big;
        });

    // Node and other CommonJS-like environments that support module.exports.
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Big;

    //Browser.
    } else {
        global.Big = Big;
    }
})(this);

},{}],2:[function(require,module,exports){
;(function () {
	'use strict';

	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */

	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/


	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;

		options = options || {};

		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;


		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;


		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;


		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;


		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;


		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;


		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;


		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;

		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;

		/**
		 * The maximum time for a tap
		 *
		 * @type number
		 */
		this.tapTimeout = options.tapTimeout || 700;

		if (FastClick.notNeeded(layer)) {
			return;
		}

		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}


		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}

		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}

		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);

		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};

			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}

		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {

			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}

	/**
	* Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
	*
	* @type boolean
	*/
	var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


	/**
	 * iOS 6.0-7.* requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {

		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}

			break;
		case 'input':

			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}

			break;
		case 'label':
		case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
		case 'video':
			return true;
		}

		return (/\bneedsclick\b/).test(target.className);
	};


	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};


	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;

		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}

		touch = event.changedTouches[0];

		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};

	FastClick.prototype.determineEventType = function(targetElement) {

		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}

		return 'click';
	};


	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;

		// Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};


	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;

		scrollParent = targetElement.fastClickScrollParent;

		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}

				parentElement = parentElement.parentElement;
			} while (parentElement);
		}

		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};


	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}

		return eventTarget;
	};


	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;

		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}

		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];

		if (deviceIsIOS) {

			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}

			if (!deviceIsIOS4) {

				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}

				this.lastTouchIdentifier = touch.identifier;

				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}

		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;

		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}

		return true;
	};


	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}

		return false;
	};


	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}

		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}

		return true;
	};


	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};


	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

		if (!this.trackingClick) {
			return true;
		}

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true;
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;

		this.lastClickTime = event.timeStamp;

		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;

		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];

			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}

		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}

				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}

			this.focus(targetElement);
			this.sendClick(targetElement, event);

			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}

			return false;
		}

		if (deviceIsIOS && !deviceIsIOS4) {

			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}

		return false;
	};


	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};


	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}

		if (event.forwardedTouchEvent) {
			return true;
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {

				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}

			// Cancel the event
			event.stopPropagation();
			event.preventDefault();

			return false;
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};


	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;

		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}

		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}

		permitted = this.onMouse(event);

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}

		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};


	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;

		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}

		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};


	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
		var firefoxVersion;

		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}

		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (chromeVersion) {

			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}

			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}

		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}

		// IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		// Firefox version - zero for other browsers
		firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (firefoxVersion >= 27) {
			// Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

			metaViewport = document.querySelector('meta[name=viewport]');
			if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
				return true;
			}
		}

		// IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
		// http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
		if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		return false;
	};


	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};


	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

		// AMD. Register as an anonymous module.
		define(function() {
			return FastClick;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick;
	} else {
		window.FastClick = FastClick;
	}
}());

},{}],3:[function(require,module,exports){
var VNode = require('./vnode');
var is = require('./is');

function addNS(data, children, sel) {
  data.ns = 'http://www.w3.org/2000/svg';

  if (sel !== 'foreignObject' && children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children, children[i].sel);
    }
  }
}

module.exports = function h(sel, b, c) {
  var data = {}, children, text, i;
  if (c !== undefined) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
  } else if (b !== undefined) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children, sel);
  }
  return VNode(sel, data, children, text, undefined);
};

},{"./is":5,"./vnode":12}],4:[function(require,module,exports){
function createElement(tagName){
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName){
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text){
  return document.createTextNode(text);
}


function insertBefore(parentNode, newNode, referenceNode){
  parentNode.insertBefore(newNode, referenceNode);
}


function removeChild(node, child){
  node.removeChild(child);
}

function appendChild(node, child){
  node.appendChild(child);
}

function parentNode(node){
  return node.parentElement;
}

function nextSibling(node){
  return node.nextSibling;
}

function tagName(node){
  return node.tagName;
}

function setTextContent(node, text){
  node.textContent = text;
}

module.exports = {
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
};

},{}],5:[function(require,module,exports){
module.exports = {
  array: Array.isArray,
  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
};

},{}],6:[function(require,module,exports){
var NamespaceURIs = {
  "xlink": "http://www.w3.org/1999/xlink"
};

var booleanAttrs = ["allowfullscreen", "async", "autofocus", "autoplay", "checked", "compact", "controls", "declare",
                "default", "defaultchecked", "defaultmuted", "defaultselected", "defer", "disabled", "draggable",
                "enabled", "formnovalidate", "hidden", "indeterminate", "inert", "ismap", "itemscope", "loop", "multiple",
                "muted", "nohref", "noresize", "noshade", "novalidate", "nowrap", "open", "pauseonexit", "readonly",
                "required", "reversed", "scoped", "seamless", "selected", "sortable", "spellcheck", "translate",
                "truespeed", "typemustmatch", "visible"];

var booleanAttrsDict = Object.create(null);
for(var i=0, len = booleanAttrs.length; i < len; i++) {
  booleanAttrsDict[booleanAttrs[i]] = true;
}

function updateAttrs(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldAttrs = oldVnode.data.attrs, attrs = vnode.data.attrs, namespaceSplit;

  if (!oldAttrs && !attrs) return;
  oldAttrs = oldAttrs || {};
  attrs = attrs || {};

  // update modified attributes, add new attributes
  for (key in attrs) {
    cur = attrs[key];
    old = oldAttrs[key];
    if (old !== cur) {
      if(!cur && booleanAttrsDict[key])
        elm.removeAttribute(key);
      else {
        namespaceSplit = key.split(":");
        if(namespaceSplit.length > 1 && NamespaceURIs.hasOwnProperty(namespaceSplit[0]))
          elm.setAttributeNS(NamespaceURIs[namespaceSplit[0]], key, cur);
        else
          elm.setAttribute(key, cur);
      }
    }
  }
  //remove removed attributes
  // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
  // the other option is to remove all attributes with value == undefined
  for (key in oldAttrs) {
    if (!(key in attrs)) {
      elm.removeAttribute(key);
    }
  }
}

module.exports = {create: updateAttrs, update: updateAttrs};

},{}],7:[function(require,module,exports){
function updateClass(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldClass = oldVnode.data.class,
      klass = vnode.data.class;

  if (!oldClass && !klass) return;
  oldClass = oldClass || {};
  klass = klass || {};

  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? 'add' : 'remove'](name);
    }
  }
}

module.exports = {create: updateClass, update: updateClass};

},{}],8:[function(require,module,exports){
function invokeHandler(handler, vnode, event) {
  if (typeof handler === "function") {
    // call function handler
    handler.call(vnode, event, vnode);
  } else if (typeof handler === "object") {
    // call handler with arguments
    if (typeof handler[0] === "function") {
      // special case for single argument for performance
      if (handler.length === 2) {
        handler[0].call(vnode, handler[1], event, vnode);
      } else {
        var args = handler.slice(1);
        args.push(event);
        args.push(vnode);
        handler[0].apply(vnode, args);
      }
    } else {
      // call multiple handlers
      for (var i = 0; i < handler.length; i++) {
        invokeHandler(handler[i]);
      }
    }
  }
}

function handleEvent(event, vnode) {
  var name = event.type,
      on = vnode.data.on;

  // call event handler(s) if exists
  if (on && on[name]) {
    invokeHandler(on[name], vnode, event);
  }
}

function createListener() {
  return function handler(event) {
    handleEvent(event, handler.vnode);
  }
}

function updateEventListeners(oldVnode, vnode) {
  var oldOn = oldVnode.data.on,
      oldListener = oldVnode.listener,
      oldElm = oldVnode.elm,
      on = vnode && vnode.data.on,
      elm = vnode && vnode.elm,
      name;

  // optimization for reused immutable handlers
  if (oldOn === on) {
    return;
  }

  // remove existing listeners which no longer used
  if (oldOn && oldListener) {
    // if element changed or deleted we remove all existing listeners unconditionally
    if (!on) {
      for (name in oldOn) {
        // remove listener if element was changed or existing listeners removed
        oldElm.removeEventListener(name, oldListener, false);
      }
    } else {
      for (name in oldOn) {
        // remove listener if existing listener removed
        if (!on[name]) {
          oldElm.removeEventListener(name, oldListener, false);
        }
      }
    }
  }

  // add new listeners which has not already attached
  if (on) {
    // reuse existing listener or create new
    var listener = vnode.listener = oldVnode.listener || createListener();
    // update vnode for listener
    listener.vnode = vnode;

    // if element changed or added we add all needed listeners unconditionally
    if (!oldOn) {
      for (name in on) {
        // add listener if element was changed or new listeners added
        elm.addEventListener(name, listener, false);
      }
    } else {
      for (name in on) {
        // add listener if new listener added
        if (!oldOn[name]) {
          elm.addEventListener(name, listener, false);
        }
      }
    }
  }
}

module.exports = {
  create: updateEventListeners,
  update: updateEventListeners,
  destroy: updateEventListeners
};

},{}],9:[function(require,module,exports){
function updateProps(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldProps = oldVnode.data.props, props = vnode.data.props;

  if (!oldProps && !props) return;
  oldProps = oldProps || {};
  props = props || {};

  for (key in oldProps) {
    if (!props[key]) {
      delete elm[key];
    }
  }
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}

module.exports = {create: updateProps, update: updateProps};

},{}],10:[function(require,module,exports){
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function updateStyle(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldStyle = oldVnode.data.style,
      style = vnode.data.style;

  if (!oldStyle && !style) return;
  oldStyle = oldStyle || {};
  style = style || {};
  var oldHasDel = 'delayed' in oldStyle;

  for (name in oldStyle) {
    if (!style[name]) {
      elm.style[name] = '';
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === 'delayed') {
      for (name in style.delayed) {
        cur = style.delayed[name];
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame(elm.style, name, cur);
        }
      }
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      elm.style[name] = cur;
    }
  }
}

function applyDestroyStyle(vnode) {
  var style, name, elm = vnode.elm, s = vnode.data.style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}

function applyRemoveStyle(vnode, rm) {
  var s = vnode.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  var name, elm = vnode.elm, idx, i = 0, maxDur = 0,
      compStyle, style = s.remove, amount = 0, applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  compStyle = getComputedStyle(elm);
  var props = compStyle['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener('transitionend', function(ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

module.exports = {create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle};

},{}],11:[function(require,module,exports){
// jshint newcap: false
/* global require, module, document, Node */
'use strict';

var VNode = require('./vnode');
var is = require('./is');
var domApi = require('./htmldomapi');

function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {}, key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i, j, cbs = {};

  if (isUndef(api)) api = domApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  function emptyNodeAt(elm) {
    var id = elm.id ? '#' + elm.id : '';
    var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
    return VNode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
  }

  function createRmCb(childElm, listeners) {
    return function() {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode, insertedVnodeQueue) {
    var i, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) {
        i(vnode);
        data = vnode.data;
      }
    }
    var elm, children = vnode.children, sel = vnode.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                                                          : api.createElement(tag);
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      if (dotIdx > 0) elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      elm = vnode.elm = api.createTextNode(vnode.text);
    }
    return vnode.elm;
  }

  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
    }
  }

  function invokeDestroyHook(vnode) {
    var i, j, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
    }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var i, listeners, rm, ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
    var i, hook;
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode);
    }
    var elm = vnode.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode.children;
    if (oldVnode === vnode) return;
    if (!sameVnode(oldVnode, vnode)) {
      var parentElm = api.parentNode(oldVnode.elm);
      elm = createElm(vnode, insertedVnodeQueue);
      api.insertBefore(parentElm, elm, oldVnode.elm);
      removeVnodes(parentElm, [oldVnode], 0, 0);
      return;
    }
    if (isDef(vnode.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      api.setTextContent(elm, vnode.text);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  return function(oldVnode, vnode) {
    var i, elm, parent;
    var insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);

      createElm(vnode, insertedVnodeQueue);

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}

module.exports = {init: init};

},{"./htmldomapi":4,"./is":5,"./vnode":12}],12:[function(require,module,exports){
module.exports = function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
};

},{}],13:[function(require,module,exports){
"use strict";var _typeof=typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"?function(obj){return typeof obj;}:function(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj;};var _extends=Object.assign||function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i];for(var key in source){if(Object.prototype.hasOwnProperty.call(source,key)){target[key]=source[key];}}}return target;};var _snabbdom=require("snabbdom");var _snabbdom2=_interopRequireDefault(_snabbdom);var _h=require("snabbdom/h");var _h2=_interopRequireDefault(_h);var _big=require("../node_modules/big.js");var _big2=_interopRequireDefault(_big);var _ugnis=require("./ugnis");var _ugnis2=_interopRequireDefault(_ugnis);var _app=require("../ugnis_components/app.json");var _app2=_interopRequireDefault(_app);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj};}function _objectWithoutProperties(obj,keys){var target={};for(var i in obj){if(keys.indexOf(i)>=0)continue;if(!Object.prototype.hasOwnProperty.call(obj,i))continue;target[i]=obj[i];}return target;}function _defineProperty(obj,key,value){if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true});}else{obj[key]=value;}return obj;}function _toConsumableArray(arr){if(Array.isArray(arr)){for(var i=0,arr2=Array(arr.length);i<arr.length;i++){arr2[i]=arr[i];}return arr2;}else{return Array.from(arr);}}function updateProps(oldVnode,vnode){var key=void 0,cur=void 0,old=void 0,elm=vnode.elm,props=vnode.data.liveProps||{};for(key in props){cur=props[key];old=elm[key];if(old!==cur)elm[key]=cur;}}var livePropsPlugin={create:updateProps,update:updateProps};var patch=_snabbdom2.default.init([require('snabbdom/modules/class'),require('snabbdom/modules/props'),require('snabbdom/modules/style'),require('snabbdom/modules/eventlisteners'),require('snabbdom/modules/attributes'),livePropsPlugin]);function uuid(){return(""+1e7+-1e3+-4e3+-8e3+-1e11).replace(/[10]/g,function(){return(0|Math.random()*16).toString(16);});}_big2.default.E_POS=1e+6;function moveInArray(array,moveIndex,toIndex){var item=array[moveIndex];var length=array.length;var diff=moveIndex-toIndex;if(diff>0){return[].concat(_toConsumableArray(array.slice(0,toIndex)),[item],_toConsumableArray(array.slice(toIndex,moveIndex)),_toConsumableArray(array.slice(moveIndex+1,length)));}else if(diff<0){return[].concat(_toConsumableArray(array.slice(0,moveIndex)),_toConsumableArray(array.slice(moveIndex+1,toIndex+1)),[item],_toConsumableArray(array.slice(toIndex+1,length)));}return array;}var attachFastClick=require('fastclick');attachFastClick(document.body);var version='0.0.31v';editor(_app2.default);function editor(appDefinition){var savedDefinition=JSON.parse(localStorage.getItem('app_key_'+version));var app=(0,_ugnis2.default)(savedDefinition||appDefinition);var node=document.createElement('div');document.body.appendChild(node);// State
var state={leftOpen:false,rightOpen:true,fullScreen:false,editorRightWidth:350,editorLeftWidth:350,subEditorWidth:350,componentEditorPosition:{x:window.innerWidth-710,y:window.innerHeight/2},appIsFrozen:false,selectedViewNode:{},selectedPipeId:'',selectedStateNodeId:'',selectedViewSubMenu:'props',editingTitleNodeId:'',viewFoldersClosed:{},draggedComponentView:null,draggedComponentStateId:null,hoveredPipe:null,hoveredViewNode:null,mousePosition:{},eventStack:[],definition:savedDefinition||app.definition};// undo/redo
var stateStack=[state.definition];var currentAnimationFrameRequest=null;function setState(newState,timeTraveling){if(newState===state){console.warn('state was mutated, search for a bug');}if(state.definition!==newState.definition){// unselect deleted components and state
if(newState.definition.state[newState.selectedStateNodeId]===undefined){newState=_extends({},newState,{selectedStateNodeId:''});}if(newState.selectedViewNode.ref!==undefined&&newState.definition[newState.selectedViewNode.ref][newState.selectedViewNode.id]===undefined){newState=_extends({},newState,{selectedViewNode:{}});}// undo/redo then render then save
if(!timeTraveling){var currentIndex=stateStack.findIndex(function(a){return a===state.definition;});stateStack=stateStack.slice(0,currentIndex+1).concat(newState.definition);}app.render(newState.definition);setTimeout(function(){return localStorage.setItem('app_key_'+version,JSON.stringify(newState.definition));},0);}if(state.appIsFrozen!==newState.appIsFrozen||state.selectedViewNode!==newState.selectedViewNode){app._freeze(newState.appIsFrozen,VIEW_NODE_SELECTED,newState.selectedViewNode);}if(newState.editingTitleNodeId&&state.editingTitleNodeId!==newState.editingTitleNodeId){// que auto focus
setTimeout(function(){var node=document.querySelectorAll('[data-istitleeditor]')[0];if(node){node.focus();}},0);}state=newState;if(!currentAnimationFrameRequest){window.requestAnimationFrame(render);}}document.addEventListener('click',function(e){// clicked outside
if(state.editingTitleNodeId&&!e.target.dataset.istitleeditor){setState(_extends({},state,{editingTitleNodeId:''}));}});window.addEventListener("resize",function(){render();},false);window.addEventListener("orientationchange",function(){render();},false);document.addEventListener('keydown',function(e){// 83 - s
// 90 - z
// 89 - y
// 32 - space
// 13 - enter
// 27 - escape
if(e.which===83&&(navigator.platform.match("Mac")?e.metaKey:e.ctrlKey)){// TODO garbage collect
e.preventDefault();fetch('/save',{method:'POST',body:JSON.stringify(state.definition),headers:{"Content-Type":"application/json"}});return false;}if(e.which===32&&(navigator.platform.match("Mac")?e.metaKey:e.ctrlKey)){e.preventDefault();FREEZER_CLICKED();}if(!e.shiftKey&&e.which===90&&(navigator.platform.match("Mac")?e.metaKey:e.ctrlKey)){e.preventDefault();var currentIndex=stateStack.findIndex(function(a){return a===state.definition;});if(currentIndex>0){var newDefinition=stateStack[currentIndex-1];setState(_extends({},state,{definition:newDefinition}),true);}}if(e.which===89&&(navigator.platform.match("Mac")?e.metaKey:e.ctrlKey)||e.shiftKey&&e.which===90&&(navigator.platform.match("Mac")?e.metaKey:e.ctrlKey)){e.preventDefault();var _currentIndex=stateStack.findIndex(function(a){return a===state.definition;});if(_currentIndex<stateStack.length-1){var _newDefinition=stateStack[_currentIndex+1];setState(_extends({},state,{definition:_newDefinition}),true);}}if(e.which===13){setState(_extends({},state,{editingTitleNodeId:''}));}if(e.which===27){FULL_SCREEN_CLICKED(false);}});// Listen to app
app.addListener(function(eventId,data,e,previousState,currentState,mutations){setState(_extends({},state,{eventStack:state.eventStack.concat({eventId:eventId,data:data,e:e,previousState:previousState,currentState:currentState,mutations:mutations})}));});// Actions
var openBoxTimeout=null;function VIEW_DRAGGED(nodeRef,parentRef,initialDepth,e){e.preventDefault();var isArrow=e.target.dataset.closearrow;var isTrashcan=e.target.dataset.trashcan;var initialX=e.touches?e.touches[0].pageX:e.pageX;var initialY=e.touches?e.touches[0].pageY:e.pageY;var position=this.elm.getBoundingClientRect();var offsetX=initialX-position.left;var offsetY=initialY-position.top;function drag(e){e.preventDefault();var x=e.touches?e.touches[0].pageX:e.pageX;var y=e.touches?e.touches[0].pageY:e.pageY;if(!state.draggedComponentView){if(Math.abs(initialY-y)>3){setState(_extends({},state,{draggedComponentView:_extends({},nodeRef,{depth:initialDepth}),mousePosition:{x:x-offsetX,y:y-offsetY}}));}}else{setState(_extends({},state,{mousePosition:{x:x-offsetX,y:y-offsetY}}));}return false;}window.addEventListener('mousemove',drag);window.addEventListener('touchmove',drag);function stopDragging(event){var _extends4,_extends8;event.preventDefault();window.removeEventListener('mousemove',drag);window.removeEventListener('touchmove',drag);window.removeEventListener('mouseup',stopDragging);window.removeEventListener('touchend',stopDragging);if(openBoxTimeout){clearTimeout(openBoxTimeout);openBoxTimeout=null;}if(!state.draggedComponentView){if(event.target===e.target&&isArrow){return VIEW_FOLDER_CLICKED(nodeRef.id);}if(event.target===e.target&&isTrashcan){return DELETE_SELECTED_VIEW(nodeRef,parentRef);}return VIEW_NODE_SELECTED(nodeRef);}if(!state.hoveredViewNode){return setState(_extends({},state,{draggedComponentView:null}));}var newParentRef=state.hoveredViewNode.parent;// frame this somewhere on how not to write code
var fixedParents=_extends({},state,{draggedComponentView:null,hoveredViewNode:null,definition:parentRef.id===newParentRef.id?_extends({},state.definition,_defineProperty({},parentRef.ref,_extends({},state.definition[parentRef.ref],_defineProperty({},parentRef.id,_extends({},state.definition[parentRef.ref][parentRef.id],{children:moveInArray(state.definition[parentRef.ref][parentRef.id].children,state.definition[parentRef.ref][parentRef.id].children.findIndex(function(ref){return ref.id===nodeRef.id;}),state.hoveredViewNode.position)}))))):parentRef.ref===newParentRef.ref?_extends({},state.definition,_defineProperty({},parentRef.ref,_extends({},state.definition[parentRef.ref],(_extends4={},_defineProperty(_extends4,parentRef.id,_extends({},state.definition[parentRef.ref][parentRef.id],{children:state.definition[parentRef.ref][parentRef.id].children.filter(function(ref){return ref.id!==nodeRef.id;})})),_defineProperty(_extends4,newParentRef.id,_extends({},state.definition[newParentRef.ref][newParentRef.id],{children:state.definition[newParentRef.ref][newParentRef.id].children.slice(0,state.hoveredViewNode.position).concat(nodeRef,state.definition[newParentRef.ref][newParentRef.id].children.slice(state.hoveredViewNode.position))})),_extends4)))):_extends({},state.definition,(_extends8={},_defineProperty(_extends8,parentRef.ref,_extends({},state.definition[parentRef.ref],_defineProperty({},parentRef.id,_extends({},state.definition[parentRef.ref][parentRef.id],{children:state.definition[parentRef.ref][parentRef.id].children.filter(function(ref){return ref.id!==nodeRef.id;})})))),_defineProperty(_extends8,newParentRef.ref,_extends({},state.definition[newParentRef.ref],_defineProperty({},newParentRef.id,_extends({},state.definition[newParentRef.ref][newParentRef.id],{children:state.definition[newParentRef.ref][newParentRef.id].children.slice(0,state.hoveredViewNode.position).concat(nodeRef,state.definition[newParentRef.ref][newParentRef.id].children.slice(state.hoveredViewNode.position))})))),_extends8))});setState(_extends({},fixedParents,{definition:_extends({},fixedParents.definition,_defineProperty({},nodeRef.ref,_extends({},fixedParents.definition[nodeRef.ref],_defineProperty({},nodeRef.id,_extends({},fixedParents.definition[nodeRef.ref][nodeRef.id],{parent:newParentRef})))))}));return false;}window.addEventListener('mouseup',stopDragging);window.addEventListener('touchend',stopDragging);return false;}function HOVER_MOBILE(e){var elem=document.elementFromPoint(e.touches[0].clientX,e.touches[0].clientY);var moveEvent=new MouseEvent('mousemove',{bubbles:true,cancelable:true,view:window,clientX:e.touches[0].clientX,clientY:e.touches[0].clientY,screenX:e.touches[0].screenX,screenY:e.touches[0].screenY});elem.dispatchEvent(moveEvent);}function VIEW_HOVERED(nodeRef,parentRef,depth,e){if(!state.draggedComponentView){return;}var hitPosition=(e.touches?28:e.layerY)/28;var insertBefore=function insertBefore(){return setState(_extends({},state,{hoveredViewNode:{parent:parentRef,depth:depth,position:state.definition[parentRef.ref][parentRef.id].children.filter(function(ref){return ref.id!==state.draggedComponentView.id;}).findIndex(function(ref){return ref.id===nodeRef.id;})}}));};var insertAfter=function insertAfter(){return setState(_extends({},state,{hoveredViewNode:{parent:parentRef,depth:depth,position:state.definition[parentRef.ref][parentRef.id].children.filter(function(ref){return ref.id!==state.draggedComponentView.id;}).findIndex(function(ref){return ref.id===nodeRef.id;})+1}}));};var insertAsFirst=function insertAsFirst(){return setState(_extends({},state,{hoveredViewNode:{parent:nodeRef,depth:depth+1,position:0}}));};var insertAsLast=function insertAsLast(){return setState(_extends({},state,{hoveredViewNode:{parent:{ref:'vNodeBox',id:'_rootNode'},depth:1,position:state.definition['vNodeBox']['_rootNode'].children.length}}));};var insertAt=function insertAt(toPutRef,index){return setState(_extends({},state,{hoveredViewNode:{parent:toPutRef,depth:depth-1,position:index+1}}));};if(nodeRef.id===state.draggedComponentView.id){var parent=state.definition[parentRef.ref][parentRef.id];// check if the last child, if yes, go to grandparent and drop there after parent
if(parent.children[parent.children.length-1].id===nodeRef.id){if(parentRef.id!=='_rootNode'){var grandparent=state.definition[parent.parent.ref][parent.parent.id];var parentPosition=grandparent.children.findIndex(function(childRef){return childRef.id===parentRef.id;});return insertAt(parent.parent,parentPosition);}}return setState(_extends({},state,{hoveredViewNode:null}));}if(nodeRef.id==='_rootNode'){return insertAsFirst();}if(nodeRef.id==='_lastNode'){return insertAsLast();}// pray to god that you did not make a mistake here
if(state.definition[nodeRef.ref][nodeRef.id].children){// if box
if(state.viewFoldersClosed[nodeRef.id]||state.definition[nodeRef.ref][nodeRef.id].children.length===0){// if closed or empty box
if(hitPosition<0.3){insertBefore();}else{if(!openBoxTimeout){openBoxTimeout=setTimeout(function(){return VIEW_FOLDER_CLICKED(nodeRef.id,false);},500);}insertAsFirst();return;}}else{// open box
if(hitPosition<0.5){insertBefore();}else{insertAsFirst();}}}else{// simple node
if(hitPosition<0.5){insertBefore();}else{insertAfter();}}if(openBoxTimeout){clearTimeout(openBoxTimeout);openBoxTimeout=null;}}function PIPE_HOVERED(pipeRef,e){if(!state.draggedComponentStateId){return;}setState(_extends({},state,{hoveredPipe:pipeRef}));}function COMPONENT_VIEW_DRAGGED(e){var initialX=e.touches?e.touches[0].pageX:e.pageX;var initialY=e.touches?e.touches[0].pageY:e.pageY;var position=this.elm.getBoundingClientRect();var offsetX=initialX-position.left;var offsetY=initialY-position.top;function drag(e){e.preventDefault();var x=e.touches?e.touches[0].pageX:e.pageX;var y=e.touches?e.touches[0].pageY:e.pageY;setState(_extends({},state,{componentEditorPosition:{x:x-offsetX,y:y-offsetY}}));}window.addEventListener('mousemove',drag);window.addEventListener('touchmove',drag);function stopDragging(event){event.preventDefault();window.removeEventListener('mousemove',drag);window.removeEventListener('touchmove',drag);window.removeEventListener('mouseup',stopDragging);window.removeEventListener('touchend',stopDragging);}window.addEventListener('mouseup',stopDragging);window.addEventListener('touchend',stopDragging);}function WIDTH_DRAGGED(widthName,e){e.preventDefault();function resize(e){e.preventDefault();// TODO refactor
var newWidth=window.innerWidth-(e.touches?e.touches[0].pageX:e.pageX);if(widthName==='editorLeftWidth'){newWidth=e.touches?e.touches[0].pageX:e.pageX;}if(widthName==='subEditorWidth'){newWidth=(e.touches?e.touches[0].pageX:e.pageX)-state.componentEditorPosition.x;}if(widthName==='subEditorWidthLeft'){newWidth=state.componentEditorPosition.x+state.subEditorWidth-(e.touches?e.touches[0].pageX:e.pageX);if(newWidth<250){return;}return setState(_extends({},state,{subEditorWidth:newWidth,componentEditorPosition:_extends({},state.componentEditorPosition,{x:e.touches?e.touches[0].pageX:e.pageX})}));}// I probably was drunk
if(widthName!=='subEditorWidth'&&widthName!=='subEditorWidth'&&((widthName==='editorLeftWidth'?state.leftOpen:state.rightOpen)?newWidth<180:newWidth>180)){if(widthName==='editorLeftWidth'){return setState(_extends({},state,{leftOpen:!state.leftOpen}));}return setState(_extends({},state,{rightOpen:!state.rightOpen}));}if(newWidth<250){newWidth=250;}setState(_extends({},state,_defineProperty({},widthName,newWidth)));return false;}window.addEventListener('mousemove',resize);window.addEventListener('touchmove',resize);function stopDragging(e){e.preventDefault();window.removeEventListener('mousemove',resize);window.removeEventListener('touchmove',resize);window.removeEventListener('mouseup',stopDragging);window.removeEventListener('touchend',stopDragging);return false;}window.addEventListener('mouseup',stopDragging);window.addEventListener('touchend',stopDragging);return false;}function STATE_DRAGGED(stateId,e){e.preventDefault();var initialX=e.touches?e.touches[0].pageX:e.pageX;var initialY=e.touches?e.touches[0].pageY:e.pageY;var position=this.elm.getBoundingClientRect();var offsetX=initialX-position.left;var offsetY=initialY-position.top;function drag(e){e.preventDefault();var x=e.touches?e.touches[0].pageX:e.pageX;var y=e.touches?e.touches[0].pageY:e.pageY;if(!state.draggedComponentView){if(Math.abs(initialY-y)>3){setState(_extends({},state,{draggedComponentStateId:stateId,mousePosition:{x:x-offsetX,y:y-offsetY}}));}}else{setState(_extends({},state,{mousePosition:{x:x-offsetX,y:y-offsetY}}));}return false;}window.addEventListener('mousemove',drag);window.addEventListener('touchmove',drag);function stopDragging(event){var _extends12,_extends13;event.preventDefault();window.removeEventListener('mousemove',drag);window.removeEventListener('touchmove',drag);window.removeEventListener('mouseup',stopDragging);window.removeEventListener('touchend',stopDragging);if(!state.draggedComponentStateId){return STATE_NODE_SELECTED(stateId);}if(!state.hoveredPipe){return setState(_extends({},state,{draggedComponentStateId:null,hoveredPipe:null}));}var joinIdState=uuid();var joinIdText=uuid();var pipeIdState=uuid();var pipeIdText=uuid();setState(_extends({},state,{draggedComponentStateId:null,hoveredPipe:null,definition:_extends({},state.definition,{pipe:_extends({},state.definition.pipe,(_extends12={},_defineProperty(_extends12,state.hoveredPipe.id,_extends({},state.definition.pipe[state.hoveredPipe.id],{transformations:[{ref:'join',id:joinIdState},{ref:'join',id:joinIdText}].concat(state.definition.pipe[state.hoveredPipe.id].transformations)})),_defineProperty(_extends12,pipeIdState,{type:'text',value:{ref:'state',id:state.draggedComponentStateId},transformations:[{ref:'toText',id:'noop'}]}),_defineProperty(_extends12,pipeIdText,{type:'text',value:'',transformations:[]}),_extends12)),join:_extends({},state.definition.join,(_extends13={},_defineProperty(_extends13,joinIdState,{value:{ref:'pipe',id:pipeIdState}}),_defineProperty(_extends13,joinIdText,{value:{ref:'pipe',id:pipeIdText}}),_extends13))})}));}window.addEventListener('mouseup',stopDragging);window.addEventListener('touchend',stopDragging);}function OPEN_SIDEBAR(side){if(side==='left'){return setState(_extends({},state,{leftOpen:!state.leftOpen}));}if(side==='right'){return setState(_extends({},state,{rightOpen:!state.rightOpen}));}}function FREEZER_CLICKED(){setState(_extends({},state,{appIsFrozen:!state.appIsFrozen}));}function VIEW_FOLDER_CLICKED(nodeId,forcedValue){setState(_extends({},state,{viewFoldersClosed:_extends({},state.viewFoldersClosed,_defineProperty({},nodeId,forcedValue!==undefined?forcedValue:!state.viewFoldersClosed[nodeId]))}));}function VIEW_NODE_SELECTED(ref){setState(_extends({},state,{selectedViewNode:ref}));}function UNSELECT_VIEW_NODE(selfOnly,stopPropagation,e){if(stopPropagation){e.stopPropagation();}if(selfOnly&&e.target!==this.elm){return;}setState(_extends({},state,{selectedViewNode:{}}));}function STATE_NODE_SELECTED(nodeId){setState(_extends({},state,{selectedStateNodeId:nodeId}));}function UNSELECT_STATE_NODE(e){if(e.target===this.elm){setState(_extends({},state,{selectedStateNodeId:''}));}}function ADD_NODE(nodeRef,type){if(!nodeRef.ref||!state.definition[nodeRef.ref][nodeRef.id]||!state.definition[nodeRef.ref][nodeRef.id].children){if(state.selectedViewNode.id&&state.selectedViewNode.id!=='_rootNode'){nodeRef=state.definition[state.selectedViewNode.ref][state.selectedViewNode.id].parent;}else{nodeRef={ref:'vNodeBox',id:'_rootNode'};}}var nodeId=nodeRef.id;var newNodeId=uuid();var newStyleId=uuid();var newStyle={};if(type==='box'){var _extends15,_extends20;var newNode={title:'box',parent:nodeRef,style:{ref:'style',id:newStyleId},children:[]};return setState(_extends({},state,{selectedViewNode:{ref:'vNodeBox',id:newNodeId},definition:nodeRef.ref==='vNodeBox'?_extends({},state.definition,{vNodeBox:_extends({},state.definition.vNodeBox,(_extends15={},_defineProperty(_extends15,nodeId,_extends({},state.definition.vNodeBox[nodeId],{children:state.definition.vNodeBox[nodeId].children.concat({ref:'vNodeBox',id:newNodeId})})),_defineProperty(_extends15,newNodeId,newNode),_extends15)),style:_extends({},state.definition.style,_defineProperty({},newStyleId,newStyle))}):_extends({},state.definition,(_extends20={},_defineProperty(_extends20,nodeRef.ref,_extends({},state.definition[nodeRef.ref],_defineProperty({},nodeId,_extends({},state.definition[nodeRef.ref][nodeId],{children:state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeBox',id:newNodeId})})))),_defineProperty(_extends20,"vNodeBox",_extends({},state.definition.vNodeBox,_defineProperty({},newNodeId,newNode))),_defineProperty(_extends20,"style",_extends({},state.definition.style,_defineProperty({},newStyleId,newStyle))),_extends20))}));}if(type==='text'){var _extends25;var pipeId=uuid();var _newNode={title:'text',parent:nodeRef,style:{ref:'style',id:newStyleId},value:{ref:'pipe',id:pipeId}};var newPipe={type:'text',value:'Default Text',transformations:[]};return setState(_extends({},state,{selectedViewNode:{ref:'vNodeText',id:newNodeId},definition:_extends({},state.definition,(_extends25={pipe:_extends({},state.definition.pipe,_defineProperty({},pipeId,newPipe))},_defineProperty(_extends25,nodeRef.ref,_extends({},state.definition[nodeRef.ref],_defineProperty({},nodeId,_extends({},state.definition[nodeRef.ref][nodeId],{children:state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeText',id:newNodeId})})))),_defineProperty(_extends25,"vNodeText",_extends({},state.definition.vNodeText,_defineProperty({},newNodeId,_newNode))),_defineProperty(_extends25,"style",_extends({},state.definition.style,_defineProperty({},newStyleId,newStyle))),_extends25))}));}if(type==='image'){var _extends30;var _pipeId=uuid();var _newNode2={title:'image',parent:nodeRef,style:{ref:'style',id:newStyleId},src:{ref:'pipe',id:_pipeId}};var _newPipe={type:'text',value:'https://www.ugnis.com/images/logo256x256.png',transformations:[]};return setState(_extends({},state,{selectedViewNode:{ref:'vNodeImage',id:newNodeId},definition:_extends({},state.definition,(_extends30={pipe:_extends({},state.definition.pipe,_defineProperty({},_pipeId,_newPipe))},_defineProperty(_extends30,nodeRef.ref,_extends({},state.definition[nodeRef.ref],_defineProperty({},nodeId,_extends({},state.definition[nodeRef.ref][nodeId],{children:state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeImage',id:newNodeId})})))),_defineProperty(_extends30,"vNodeImage",_extends({},state.definition.vNodeImage,_defineProperty({},newNodeId,_newNode2))),_defineProperty(_extends30,"style",_extends({},state.definition.style,_defineProperty({},newStyleId,newStyle))),_extends30))}));}if(type==='if'){var _extends32,_extends36;var _pipeId2=uuid();var _newNode3={title:'conditional',parent:nodeRef,value:{ref:'pipe',id:_pipeId2},children:[]};var _newPipe2={type:'boolean',value:true,transformations:[]};return setState(_extends({},state,{selectedViewNode:{ref:'vNodeIf',id:newNodeId},definition:nodeRef.ref==='vNodeIf'?_extends({},state.definition,{pipe:_extends({},state.definition.pipe,_defineProperty({},_pipeId2,_newPipe2)),vNodeIf:_extends({},state.definition.vNodeIf,(_extends32={},_defineProperty(_extends32,nodeId,_extends({},state.definition.vNodeIf[nodeId],{children:state.definition.vNodeIf[nodeId].children.concat({ref:'vNodeIf',id:newNodeId})})),_defineProperty(_extends32,newNodeId,_newNode3),_extends32))}):_extends({},state.definition,(_extends36={pipe:_extends({},state.definition.pipe,_defineProperty({},_pipeId2,_newPipe2))},_defineProperty(_extends36,nodeRef.ref,_extends({},state.definition[nodeRef.ref],_defineProperty({},nodeId,_extends({},state.definition[nodeRef.ref][nodeId],{children:state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeIf',id:newNodeId})})))),_defineProperty(_extends36,"vNodeIf",_extends({},state.definition.vNodeIf,_defineProperty({},newNodeId,_newNode3))),_extends36))}));}if(type==='input'){var _extends37,_extends45;var stateId=uuid();var eventId=uuid();var mutatorId=uuid();var pipeInputId=uuid();var pipeMutatorId=uuid();var _newNode4={title:'input',parent:nodeRef,style:{ref:'style',id:newStyleId},value:{ref:'pipe',id:pipeInputId},input:{ref:'event',id:eventId}};var newPipeInput={type:'text',value:{ref:'state',id:stateId},transformations:[]};var newPipeMutator={type:'text',value:{ref:'eventData',id:'_input'},transformations:[]};var newState={title:'input value',type:'text',ref:stateId,defaultValue:'Default text',mutators:[{ref:'mutator',id:mutatorId}]};var newMutator={event:{ref:'event',id:eventId},state:{ref:'state',id:stateId},mutation:{ref:'pipe',id:pipeMutatorId}};var newEvent={type:'input',title:'update input',mutators:[{ref:'mutator',id:mutatorId}],emitter:{ref:'vNodeInput',id:newNodeId},data:[{ref:'eventData',id:'_input'}]};return setState(_extends({},state,{selectedViewNode:{ref:'vNodeInput',id:newNodeId},definition:_extends({},state.definition,(_extends45={pipe:_extends({},state.definition.pipe,(_extends37={},_defineProperty(_extends37,pipeInputId,newPipeInput),_defineProperty(_extends37,pipeMutatorId,newPipeMutator),_extends37))},_defineProperty(_extends45,nodeRef.ref,_extends({},state.definition[nodeRef.ref],_defineProperty({},nodeId,_extends({},state.definition[nodeRef.ref][nodeId],{children:state.definition[nodeRef.ref][nodeId].children.concat({ref:'vNodeInput',id:newNodeId})})))),_defineProperty(_extends45,"vNodeInput",_extends({},state.definition.vNodeInput,_defineProperty({},newNodeId,_newNode4))),_defineProperty(_extends45,"style",_extends({},state.definition.style,_defineProperty({},newStyleId,newStyle))),_defineProperty(_extends45,"nameSpace",_extends({},state.definition.nameSpace,_defineProperty({},'_rootNameSpace',_extends({},state.definition.nameSpace['_rootNameSpace'],{children:state.definition.nameSpace['_rootNameSpace'].children.concat({ref:'state',id:stateId})})))),_defineProperty(_extends45,"state",_extends({},state.definition.state,_defineProperty({},stateId,newState))),_defineProperty(_extends45,"mutator",_extends({},state.definition.mutator,_defineProperty({},mutatorId,newMutator))),_defineProperty(_extends45,"event",_extends({},state.definition.event,_defineProperty({},eventId,newEvent))),_extends45))}));}}function ADD_STATE(namespaceId,type){var newStateId=uuid();var newState=void 0;if(type==='text'){newState={title:'new text',ref:newStateId,type:'text',defaultValue:'Default text',mutators:[]};}if(type==='number'){newState={title:'new number',ref:newStateId,type:'number',defaultValue:0,mutators:[]};}if(type==='boolean'){newState={title:'new boolean',type:'boolean',ref:newStateId,defaultValue:true,mutators:[]};}if(type==='table'){newState={title:'new table',type:'table',ref:newStateId,defaultValue:{},mutators:[]};}if(type==='folder'){var _extends46;newState={title:'new folder',children:[]};return setState(_extends({},state,{definition:_extends({},state.definition,{nameSpace:_extends({},state.definition.nameSpace,(_extends46={},_defineProperty(_extends46,namespaceId,_extends({},state.definition.nameSpace[namespaceId],{children:state.definition.nameSpace[namespaceId].children.concat({ref:'nameSpace',id:newStateId})})),_defineProperty(_extends46,newStateId,newState),_extends46))})}));}setState(_extends({},state,{definition:_extends({},state.definition,{nameSpace:_extends({},state.definition.nameSpace,_defineProperty({},namespaceId,_extends({},state.definition.nameSpace[namespaceId],{children:state.definition.nameSpace[namespaceId].children.concat({ref:'state',id:newStateId})}))),state:_extends({},state.definition.state,_defineProperty({},newStateId,newState))})}));}function ADD_DEFAULT_STYLE(styleId,key){var pipeId=uuid();var defaults={'background':'white','border':'1px solid black','outline':'1px solid black','cursor':'pointer','color':'black','display':'block','top':'0px','bottom':'0px','left':'0px','right':'0px','flex':'1 1 auto','justifyContent':'center','alignItems':'center','maxWidth':'100%','maxHeight':'100%','minWidth':'100%','minHeight':'100%','position':'absolute','overflow':'auto','height':'500px','width':'500px','font':'italic 2em "Comic Sans MS", cursive, sans-serif','margin':'10px','padding':'10px'};setState(_extends({},state,{definition:_extends({},state.definition,{pipe:_extends({},state.definition.pipe,_defineProperty({},pipeId,{type:'text',value:defaults[key],transformations:[]})),style:_extends({},state.definition.style,_defineProperty({},styleId,_extends({},state.definition.style[styleId],_defineProperty({},key,{ref:'pipe',id:pipeId}))))})}));}function SELECT_VIEW_SUBMENU(newId){setState(_extends({},state,{selectedViewSubMenu:newId}));}function EDIT_VIEW_NODE_TITLE(nodeId){setState(_extends({},state,{editingTitleNodeId:nodeId}));}function DELETE_SELECTED_VIEW(nodeRef,parentRef){if(nodeRef.id==='_rootNode'){if(state.definition.vNodeBox['_rootNode'].children.length===0){return;}// immutably remove all nodes except rootNode
return setState(_extends({},state,{definition:_extends({},state.definition,{vNodeBox:{'_rootNode':_extends({},state.definition.vNodeBox['_rootNode'],{children:[]})}}),selectedViewNode:{}}));}setState(_extends({},state,{definition:_extends({},state.definition,_defineProperty({},parentRef.ref,_extends({},state.definition[parentRef.ref],_defineProperty({},parentRef.id,_extends({},state.definition[parentRef.ref][parentRef.id],{children:state.definition[parentRef.ref][parentRef.id].children.filter(function(ref){return ref.id!==nodeRef.id;})}))))),selectedViewNode:{}}));}function CHANGE_VIEW_NODE_TITLE(nodeRef,e){e.preventDefault();var nodeId=nodeRef.id;var nodeType=nodeRef.ref;setState(_extends({},state,{definition:_extends({},state.definition,_defineProperty({},nodeType,_extends({},state.definition[nodeType],_defineProperty({},nodeId,_extends({},state.definition[nodeType][nodeId],{title:e.target.value})))))}));}function CHANGE_STATE_NODE_TITLE(nodeId,e){e.preventDefault();setState(_extends({},state,{definition:_extends({},state.definition,{state:_extends({},state.definition.state,_defineProperty({},nodeId,_extends({},state.definition.state[nodeId],{title:e.target.value})))})}));}function CHANGE_NAMESPACE_TITLE(nodeId,e){e.preventDefault();setState(_extends({},state,{definition:_extends({},state.definition,{nameSpace:_extends({},state.definition.nameSpace,_defineProperty({},nodeId,_extends({},state.definition.nameSpace[nodeId],{title:e.target.value})))})}));}function CHANGE_CURRENT_STATE_TEXT_VALUE(stateId,e){app.setCurrentState(_extends({},app.getCurrentState(),_defineProperty({},stateId,e.target.value)));render();}function CHANGE_CURRENT_STATE_NUMBER_VALUE(stateId,e){// todo big throws error instead of returning NaN... fix, rewrite or hack
try{if((0,_big2.default)(e.target.value).toString()!==app.getCurrentState()[stateId].toString()){app.setCurrentState(_extends({},app.getCurrentState(),_defineProperty({},stateId,(0,_big2.default)(e.target.value))));render();}}catch(err){}}function CHANGE_STATIC_VALUE(ref,propertyName,type,e){var value=e.target.value;if(type==='number'){try{value=(0,_big2.default)(e.target.value);}catch(err){return;}}if(type==='boolean'){value=value===true||value==='true'?true:false;}setState(_extends({},state,{definition:_extends({},state.definition,_defineProperty({},ref.ref,_extends({},state.definition[ref.ref],_defineProperty({},ref.id,_extends({},state.definition[ref.ref][ref.id],_defineProperty({},propertyName,value))))))}));}function ADD_EVENT(propertyName,node){var _extends66;var ref=state.selectedViewNode;var eventId=uuid();setState(_extends({},state,{definition:_extends({},state.definition,(_extends66={},_defineProperty(_extends66,ref.ref,_extends({},state.definition[ref.ref],_defineProperty({},ref.id,_extends({},state.definition[ref.ref][ref.id],_defineProperty({},propertyName,{ref:'event',id:eventId}))))),_defineProperty(_extends66,"event",_extends({},state.definition.event,_defineProperty({},eventId,{type:propertyName,emitter:node,mutators:[],data:[]}))),_extends66))}));}function SELECT_PIPE(pipeId,e){e.stopPropagation();setState(_extends({},state,{selectedPipeId:pipeId}));}function CHANGE_PIPE_VALUE_TO_STATE(pipeId){if(!state.selectedStateNodeId||state.selectedStateNodeId===state.definition.pipe[pipeId].value.id){return;}setState(_extends({},state,{definition:_extends({},state.definition,{pipe:_extends({},state.definition.pipe,_defineProperty({},pipeId,_extends({},state.definition.pipe[pipeId],{value:{ref:'state',id:state.selectedStateNodeId},transformations:[]})))})}));}function ADD_TRANSFORMATION(pipeId,transformation){if(transformation==='join'){var _extends69;var newPipeId=uuid();var joinId=uuid();setState(_extends({},state,{definition:_extends({},state.definition,{join:_extends({},state.definition.join,_defineProperty({},joinId,{value:{ref:'pipe',id:newPipeId}})),pipe:_extends({},state.definition.pipe,(_extends69={},_defineProperty(_extends69,newPipeId,{type:'text',value:'Default text',transformations:[]}),_defineProperty(_extends69,pipeId,_extends({},state.definition.pipe[pipeId],{transformations:state.definition.pipe[pipeId].transformations.concat({ref:'join',id:joinId})})),_extends69))})}));}if(transformation==='toUpperCase'){var newId=uuid();setState(_extends({},state,{definition:_extends({},state.definition,{toUpperCase:_extends({},state.definition.toUpperCase,_defineProperty({},newId,{})),pipe:_extends({},state.definition.pipe,_defineProperty({},pipeId,_extends({},state.definition.pipe[pipeId],{transformations:state.definition.pipe[pipeId].transformations.concat({ref:'toUpperCase',id:newId})})))})}));}if(transformation==='toLowerCase'){var _newId=uuid();setState(_extends({},state,{definition:_extends({},state.definition,{toLowerCase:_extends({},state.definition.toLowerCase,_defineProperty({},_newId,{})),pipe:_extends({},state.definition.pipe,_defineProperty({},pipeId,_extends({},state.definition.pipe[pipeId],{transformations:state.definition.pipe[pipeId].transformations.concat({ref:'toLowerCase',id:_newId})})))})}));}if(transformation==='toText'){var _newId2=uuid();setState(_extends({},state,{definition:_extends({},state.definition,{toText:_extends({},state.definition.toText,_defineProperty({},_newId2,{})),pipe:_extends({},state.definition.pipe,_defineProperty({},pipeId,_extends({},state.definition.pipe[pipeId],{transformations:state.definition.pipe[pipeId].transformations.concat({ref:'toText',id:_newId2})})))})}));}if(transformation==='add'){var _extends77;var _newPipeId=uuid();var addId=uuid();setState(_extends({},state,{definition:_extends({},state.definition,{add:_extends({},state.definition.add,_defineProperty({},addId,{value:{ref:'pipe',id:_newPipeId}})),pipe:_extends({},state.definition.pipe,(_extends77={},_defineProperty(_extends77,_newPipeId,{type:'number',value:0,transformations:[]}),_defineProperty(_extends77,pipeId,_extends({},state.definition.pipe[pipeId],{transformations:state.definition.pipe[pipeId].transformations.concat({ref:'add',id:addId})})),_extends77))})}));}if(transformation==='subtract'){var _extends79;var _newPipeId2=uuid();var subtractId=uuid();setState(_extends({},state,{definition:_extends({},state.definition,{subtract:_extends({},state.definition.subtract,_defineProperty({},subtractId,{value:{ref:'pipe',id:_newPipeId2}})),pipe:_extends({},state.definition.pipe,(_extends79={},_defineProperty(_extends79,_newPipeId2,{type:'number',value:0,transformations:[]}),_defineProperty(_extends79,pipeId,_extends({},state.definition.pipe[pipeId],{transformations:state.definition.pipe[pipeId].transformations.concat({ref:'subtract',id:subtractId})})),_extends79))})}));}}function RESET_APP_STATE(){app.setCurrentState(app.createDefaultState());setState(_extends({},state,{eventStack:[]}));}function RESET_APP_DEFINITION(){if(state.definition!==appDefinition){setState(_extends({},state,{definition:_extends({},appDefinition)}));}}function FULL_SCREEN_CLICKED(value){if(value!==state.fullScreen){setState(_extends({},state,{fullScreen:value}));}}function SAVE_DEFAULT(stateId){setState(_extends({},state,{definition:_extends({},state.definition,{state:_extends({},state.definition.state,_defineProperty({},stateId,_extends({},state.definition.state[stateId],{defaultValue:app.getCurrentState()[stateId]})))})}));}function DELETE_STATE(stateId){var _state$definition$sta=state.definition.state,deletedState=_state$definition$sta[stateId],newState=_objectWithoutProperties(_state$definition$sta,[stateId]);setState(_extends({},state,{definition:_extends({},state.definition,{state:newState,nameSpace:_extends({},state.definition.nameSpace,{'_rootNameSpace':_extends({},state.definition.nameSpace['_rootNameSpace'],{children:state.definition.nameSpace['_rootNameSpace'].children.filter(function(ref){return ref.id!==stateId;})})})})}));}var boxIcon=function boxIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'layers');};var ifIcon=function ifIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'},style:{transform:'rotate(90deg)'}},'call_split');};var numberIcon=function numberIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'looks_one');};var listIcon=function listIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'view_list');};var inputIcon=function inputIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'input');};var textIcon=function textIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'text_fields');};var deleteIcon=function deleteIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons','data-trashcan':true}},'delete_forever');};var clearIcon=function clearIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'clear');};var folderIcon=function folderIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'folder');};var saveIcon=function saveIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'check');};var imageIcon=function imageIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'}},'image');};var appIcon=function appIcon(){return(0,_h2.default)('i',{attrs:{class:'material-icons'},style:{fontSize:'18px'}},'description');};var arrowIcon=function arrowIcon(rotate){return(0,_h2.default)('i',{attrs:{class:'material-icons','data-closearrow':true},style:{transition:'all 0.2s',transform:rotate?'rotate(-90deg)':'rotate(0deg)',cursor:'pointer'}},'expand_more');};function render(){var currentRunningState=app.getCurrentState();var dragComponentLeft=(0,_h2.default)('div',{on:{mousedown:[WIDTH_DRAGGED,'editorLeftWidth'],touchstart:[WIDTH_DRAGGED,'editorLeftWidth']},style:{position:'absolute',right:'0',transform:'translateX(100%)',top:'0',width:'10px',height:'100%',textAlign:'center',fontSize:'1em',opacity:'0',cursor:'col-resize'}});var openComponentLeft=(0,_h2.default)('div',{on:{mousedown:[OPEN_SIDEBAR,'left'],touchstart:[OPEN_SIDEBAR,'left']},style:{position:'absolute',right:'-3px',top:'50%',transform:'translateZ(0) translateX(100%) translateY(-50%)',width:'15px',height:'10%',textAlign:'center',fontSize:'1em',borderRadius:'0 5px 5px 0',background:'#5d5d5d',boxShadow:'inset 0 0 2px 7px #222',cursor:'pointer'}});var openComponentRight=(0,_h2.default)('div',{on:{mousedown:[OPEN_SIDEBAR,'right'],touchstart:[OPEN_SIDEBAR,'right']},style:{position:'absolute',left:'-3px',top:'50%',transform:'translateZ(0) translateX(-100%) translateY(-50%)',width:'15px',height:'10%',textAlign:'center',fontSize:'1em',borderRadius:'5px 0 0 5px',background:'#5d5d5d',boxShadow:'inset 0 0 2px 7px #222',cursor:'pointer'}});var dragComponentRight=(0,_h2.default)('div',{on:{mousedown:[WIDTH_DRAGGED,'editorRightWidth'],touchstart:[WIDTH_DRAGGED,'editorRightWidth']},style:{position:'absolute',left:'0',transform:'translateX(-100%)',top:'0',width:'10px',height:'100%',textAlign:'center',fontSize:'1em',opacity:'0',cursor:'col-resize'}});var dragSubComponentRight=(0,_h2.default)('div',{on:{mousedown:[WIDTH_DRAGGED,'subEditorWidth'],touchstart:[WIDTH_DRAGGED,'subEditorWidth']},style:{position:'absolute',right:'2px',transform:'translateX(100%)',top:'0',width:'10px',height:'100%',textAlign:'center',fontSize:'1em',opacity:0,cursor:'col-resize'}});var dragSubComponentLeft=(0,_h2.default)('div',{on:{mousedown:[WIDTH_DRAGGED,'subEditorWidthLeft'],touchstart:[WIDTH_DRAGGED,'subEditorWidthLeft']},style:{position:'absolute',left:'2px',transform:'translateX(-100%)',top:'0',width:'10px',height:'100%',textAlign:'center',fontSize:'1em',opacity:0,cursor:'col-resize'}});function emberEditor(ref,type){var pipe=state.definition[ref.ref][ref.id];function listTransformations(transformations,transType){return transformations.map(function(transRef,index){var transformer=state.definition[transRef.ref][transRef.id];if(transRef.ref==='equal'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{key:index,style:{color:'#bdbdbd',cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1'}},transRef.ref),(0,_h2.default)('span',{style:{flex:'0',color:transformations.length-1!==index?'#bdbdbd':transType===type?'green':'red'}},'true/false')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},[emberEditor(transformer.value,type)])]);}if(transRef.ref==='add'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{key:index,style:{color:'#bdbdbd',cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1'}},transRef.ref),(0,_h2.default)('span',{style:{flex:'0',color:transformations.length-1!==index?'#bdbdbd':transType===type?'green':'red'}},'number')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},[emberEditor(transformer.value,'number')])]);}if(transRef.ref==='subtract'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{key:index,style:{color:'#bdbdbd',cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1'}},transRef.ref),(0,_h2.default)('span',{style:{flex:'0',color:transformations.length-1!==index?'#bdbdbd':transType===type?'green':'red'}},'number')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},[emberEditor(transformer.value,'number')])]);}if(transRef.ref==='multiply'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{key:index,style:{color:'#bdbdbd',cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1'}},transRef.ref),(0,_h2.default)('span',{style:{flex:'0',color:transformations.length-1!==index?'#bdbdbd':transType===type?'green':'red'}},'number')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},[emberEditor(transformer.value,'number')])]);}if(transRef.ref==='divide'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{key:index,style:{color:'#bdbdbd',cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1'}},transRef.ref),(0,_h2.default)('span',{style:{flex:'0',color:transformations.length-1!==index?'#bdbdbd':transType===type?'green':'red'}},'number')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},[emberEditor(transformer.value,'number')])]);}if(transRef.ref==='remainder'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{key:index,style:{color:'#bdbdbd',cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1'}},transRef.ref),(0,_h2.default)('span',{style:{flex:'0',color:transformations.length-1!==index?'#bdbdbd':transType===type?'green':'red'}},'number')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},[emberEditor(transformer.value,'number')])]);}// if (transRef.ref === 'branch') {
//     if(resolve(transformer.predicate)){
//         value = transformValue(value, transformer.then)
//     } else {
//         value = transformValue(value, transformer.else)
//     }
// }
if(transRef.ref==='join'){return(0,_h2.default)('span',{},[emberEditor(transformer.value,transType)]);}if(transRef.ref==='toUpperCase'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{style:{cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1',color:'#bdbdbd'}},transRef.ref)])]);}if(transRef.ref==='toLowerCase'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{style:{cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1',color:'#bdbdbd'}},transRef.ref)])]);}if(transRef.ref==='toText'){return(0,_h2.default)('div',{},[(0,_h2.default)('div',{style:{cursor:'default',display:'flex'}},[(0,_h2.default)('span',{style:{flex:'1',color:'#bdbdbd'}},transRef.ref)])]);}});}function genTransformators(){var selectedPipe=state.definition.pipe[state.selectedPipeId];return[(0,_h2.default)('div',{style:{position:'fixed',top:state.componentEditorPosition.y+'px',left:state.componentEditorPosition.x-307+'px',height:'50%',width:'300px',display:'flex'}},[(0,_h2.default)('div',{style:{border:'3px solid #222',flex:'1 1 0%',background:'#4d4d4d',marginBottom:'10px'}},[(0,_h2.default)('div',{style:{display:'flex',cursor:'default',alignItems:'center',background:'#222',paddingTop:'2px',paddingBottom:'5px',color:'#53B2ED',minWidth:'100%'}},[(0,_h2.default)('span',{style:{flex:'5 5 auto',margin:'0 5px',minWidth:'0',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',fontSize:'0.8em'}},'Ugnis Toolbox'),(0,_h2.default)('span',{style:{flex:'0 0 auto',marginLeft:'auto',cursor:'pointer',marginRight:'5px',color:'white',display:'inline-flex'},on:{mousedown:[SELECT_PIPE,''],touchstart:[SELECT_PIPE,'']}},[clearIcon()])])])])];}if(typeof pipe.value==='string'){return(0,_h2.default)('div',{style:{position:'relative'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'baseline'},on:{click:[SELECT_PIPE,ref.id]}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',position:'relative',transform:'translateZ(0)'}},[(0,_h2.default)('span',{style:{opacity:'0',display:'inline-block',whiteSpace:'pre',padding:'0 5px 2px 5px',borderBottom:'2px solid white'}},pipe.value),(0,_h2.default)('input',{attrs:{type:'text'},style:{color:'white',outline:'none',boxShadow:'none',textAlign:'center',display:'inline',border:'none',borderBottom:'2px solid white',background:'none',font:'inherit',position:'absolute',top:'0',left:'0',width:'100%',flex:'0 0 auto'},on:{input:[CHANGE_STATIC_VALUE,ref,'value','text'],mousemove:[PIPE_HOVERED,ref]},liveProps:{value:pipe.value}})])].concat(_toConsumableArray(listTransformations(pipe.transformations,pipe.type)))),(0,_h2.default)('div',state.selectedPipeId===ref.id?genTransformators():[])]);}if(pipe.value===true||pipe.value===false){return(0,_h2.default)('select',{liveProps:{value:pipe.value.toString()},style:{},on:{input:[CHANGE_STATIC_VALUE,ref,'value','boolean']}},[(0,_h2.default)('option',{attrs:{value:'true'},style:{color:'black'}},['true']),(0,_h2.default)('option',{attrs:{value:'false'},style:{color:'black'}},['false'])]);}if(!isNaN(parseFloat(Number(pipe.value)))&&isFinite(Number(pipe.value))){return(0,_h2.default)('div',{style:{position:'relative'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center'},on:{click:[SELECT_PIPE,ref.id]}},[(0,_h2.default)('input',{attrs:{type:'number'},style:{background:'none',outline:'none',padding:'0',margin:'0',border:'none',borderRadius:'0',display:'inline-block',width:'100%',color:'white',textDecoration:'underline'},on:{input:[CHANGE_STATIC_VALUE,ref,'value','number']},liveProps:{value:Number(pipe.value)}}),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:pipe.transformations.length>0?'#bdbdbd':type==='number'?'green':'red'}},'number')]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},listTransformations(pipe.transformations,pipe.type)),(0,_h2.default)('div',state.selectedPipeId===ref.id?genTransformators():[])]);}if(pipe.value.ref==='state'){var displState=state.definition[pipe.value.ref][pipe.value.id];return(0,_h2.default)('div',{style:{position:'relative',cursor:'pointer'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center'},on:{click:[SELECT_PIPE,ref.id]}},[(0,_h2.default)('div',{style:{flex:'1'}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',display:'inline-block',position:'relative',transform:'translateZ(0)',boxShadow:'inset 0 0 0 2px '+(state.selectedStateNodeId===pipe.value.id?'#eab65c':'#828282'),background:'#444',padding:'4px 7px'}},[(0,_h2.default)('span',{style:{color:'white',display:'inline-block'},on:{click:[STATE_NODE_SELECTED,pipe.value.id]}},displState.title)])])]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},listTransformations(pipe.transformations,pipe.type)),(0,_h2.default)('div',state.selectedPipeId===ref.id?genTransformators():[])]);}if(pipe.value.ref==='listValue'){return(0,_h2.default)('div','TODO');}if(pipe.value.ref==='eventData'){var eventData=state.definition[pipe.value.ref][pipe.value.id];return(0,_h2.default)('div',[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center'},on:{click:[SELECT_PIPE,ref.id]}},[(0,_h2.default)('div',{style:{flex:'1'}},[(0,_h2.default)('div',{style:{cursor:'pointer',color:state.selectedStateNodeId===pipe.value.id?'#eab65c':'white',padding:'2px 5px',margin:'3px 3px 0 0',border:'2px solid '+(state.selectedStateNodeId===pipe.value.id?'#eab65c':'white'),display:'inline-block'},on:{click:[STATE_NODE_SELECTED,pipe.value.id]}},[eventData.title])]),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:pipe.transformations.length>0?'#bdbdbd':eventData.type===type?'green':'red'}},eventData.type)]),(0,_h2.default)('div',{style:{paddingLeft:'15px'}},listTransformations(pipe.transformations,pipe.type))]);}}function listState(stateId){var currentState=state.definition.state[stateId];function editingNode(){return(0,_h2.default)('input',{style:{color:'white',outline:'none',padding:'4px 7px',boxShadow:'none',display:'inline',border:'none',background:'none',font:'inherit',position:'absolute',top:'0',left:'0',width:'100%',flex:'0 0 auto'},on:{input:[CHANGE_STATE_NODE_TITLE,stateId]},liveProps:{value:currentState.title},attrs:{'data-istitleeditor':true}});}return(0,_h2.default)('div',{style:{cursor:'pointer',position:'relative',fontSize:'14px'}},[(0,_h2.default)('span',{style:{display:'flex',flexWrap:'wrap',marginTop:'6px'}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',position:'relative',transform:'translateZ(0)',margin:'0 7px 0 0',boxShadow:'inset 0 0 0 2px '+(state.selectedStateNodeId===stateId?'#eab65c':'#828282'),background:'#444',padding:'4px 7px'}},[(0,_h2.default)('span',{style:{opacity:state.editingTitleNodeId===stateId?'0':'1',color:'white',display:'inline-block'},on:{mousedown:[STATE_DRAGGED,stateId],touchstart:[STATE_DRAGGED,stateId],touchmove:[HOVER_MOBILE],dblclick:[EDIT_VIEW_NODE_TITLE,stateId]}},currentState.title),state.editingTitleNodeId===stateId?editingNode():(0,_h2.default)('span')]),function(){var noStyleInput={color:currentRunningState[stateId]!==state.definition.state[stateId].defaultValue?'rgb(91, 204, 91)':'white',background:'none',outline:'none',display:'inline',flex:'1',minWidth:'50px',border:'none',boxShadow:'inset 0 -2px 0 0 '+(state.selectedStateNodeId===stateId?'#eab65c':'#828282')};if(currentState.type==='text')return(0,_h2.default)('input',{attrs:{type:'text'},liveProps:{value:currentRunningState[stateId]},style:noStyleInput,on:{input:[CHANGE_CURRENT_STATE_TEXT_VALUE,stateId]}});if(currentState.type==='number')return(0,_h2.default)('input',{attrs:{type:'number'},liveProps:{value:currentRunningState[stateId]},style:noStyleInput,on:{input:[CHANGE_CURRENT_STATE_NUMBER_VALUE,stateId]}});if(currentState.type==='boolean')return(0,_h2.default)('select',{liveProps:{value:currentRunningState[stateId].toString()},style:noStyleInput,on:{input:[CHANGE_CURRENT_STATE_TEXT_VALUE,stateId]}},[(0,_h2.default)('option',{attrs:{value:'true'},style:{color:'black'}},['true']),(0,_h2.default)('option',{attrs:{value:'false'},style:{color:'black'}},['false'])]);if(currentState.type==='table'){var _ret=function(){if(state.selectedStateNodeId!==stateId){return{v:(0,_h2.default)('div',{key:'icon',on:{click:[STATE_NODE_SELECTED,stateId]},style:{display:'flex',alignItems:'center',marginTop:'7px'}},[listIcon()])};}var table=currentRunningState[stateId];return{v:(0,_h2.default)('div',{key:'table',style:{background:'#828183',width:'100%',flex:'0 0 100%'}},[(0,_h2.default)('div',{style:{display:'flex'}},Object.keys(currentState.definition).map(function(key){return(0,_h2.default)('div',{style:{flex:'1',padding:'2px 5px',borderBottom:'2px solid white'}},key);}))].concat(_toConsumableArray(Object.keys(table).map(function(id){return(0,_h2.default)('div',{style:{display:'flex'}},Object.keys(table[id]).map(function(key){return(0,_h2.default)('div',{style:{flex:'1',padding:'2px 5px'}},table[id][key]);}));}))))};}();if((typeof _ret==="undefined"?"undefined":_typeof(_ret))==="object")return _ret.v;}}(),currentState.type!=='table'&&currentRunningState[stateId]!==state.definition.state[stateId].defaultValue?(0,_h2.default)('div',{style:{display:'inline-flex',alignSelf:'center'},on:{click:[SAVE_DEFAULT,stateId]}},[saveIcon()]):(0,_h2.default)('span'),state.selectedStateNodeId===stateId&&currentState.type!=='table'?(0,_h2.default)('div',{style:{display:'inline-flex',alignSelf:'center'},on:{click:[DELETE_STATE,stateId]}},[deleteIcon()]):(0,_h2.default)('span')]),state.selectedStateNodeId===stateId?(0,_h2.default)('span',currentState.mutators.map(function(mutatorRef){var mutator=state.definition[mutatorRef.ref][mutatorRef.id];var event=state.definition[mutator.event.ref][mutator.event.id];var emitter=state.definition[event.emitter.ref][event.emitter.id];return(0,_h2.default)('div',{style:{display:'flex',cursor:'pointer',alignItems:'center',background:'#444',paddingTop:'3px',paddingBottom:'3px',color:state.selectedViewNode.id===event.emitter.id?'#53B2ED':'white',transition:'0.2s all',minWidth:'100%'},on:{click:[VIEW_NODE_SELECTED,event.emitter]}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',margin:'0 3px 0 5px',display:'inline-flex'}},[event.emitter.ref==='vNodeBox'?boxIcon():event.emitter.ref==='vNodeList'?listIcon():event.emitter.ref==='vNodeList'?ifIcon():event.emitter.ref==='vNodeInput'?inputIcon():textIcon()]),(0,_h2.default)('span',{style:{flex:'5 5 auto',margin:'0 5px 0 0',minWidth:'0',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}},emitter.title),(0,_h2.default)('span',{style:{flex:'0 0 auto',marginLeft:'auto',marginRight:'5px',color:'#5bcc5b'}},event.type)]);})):(0,_h2.default)('span')]);}function fakeState(stateId){var currentState=state.definition.state[stateId];return(0,_h2.default)('span',{style:{flex:'0 0 auto',position:'relative',transform:'translateZ(0)',margin:'7px 7px 0 0',boxShadow:'inset 0 0 0 2px '+(state.selectedStateNodeId===stateId?'#eab65c':'#828282'),background:'#444',padding:'4px 7px'}},[(0,_h2.default)('span',{style:{color:'white',display:'inline-block'}},currentState.title)]);}var stateComponent=(0,_h2.default)('div',{attrs:{class:'better-scrollbar'},style:{overflow:'auto',flex:'1',padding:'0 10px'},on:{click:[UNSELECT_STATE_NODE]}},state.definition.nameSpace['_rootNameSpace'].children.map(function(ref){return listState(ref.id);}));function listNode(nodeRef,parentRef,depth){if(nodeRef.id==='_rootNode')return listRootNode(nodeRef);if(nodeRef.ref==='vNodeText')return simpleNode(nodeRef,parentRef,depth);if(nodeRef.ref==='vNodeImage')return simpleNode(nodeRef,parentRef,depth);if(nodeRef.ref==='vNodeBox'||nodeRef.ref==='vNodeList'||nodeRef.ref==='vNodeIf')return listBoxNode(nodeRef,parentRef,depth);if(nodeRef.ref==='vNodeInput')return simpleNode(nodeRef,parentRef,depth);}function prevent_bubbling(e){e.stopPropagation();}function editingNode(nodeRef){return(0,_h2.default)('input',{style:{border:'none',height:'26px',background:'none',color:'#53B2ED',outline:'none',flex:'1',padding:'0',boxShadow:'inset 0 -1px 0 0 #53B2ED',font:'inherit',paddingLeft:'2px'},on:{mousedown:prevent_bubbling,input:[CHANGE_VIEW_NODE_TITLE,nodeRef]},liveProps:{value:state.definition[nodeRef.ref][nodeRef.id].title},attrs:{autofocus:true,'data-istitleeditor':true}});}function listRootNode(nodeRef){var nodeId=nodeRef.id;var node=state.definition[nodeRef.ref][nodeId];return(0,_h2.default)('div',{style:{position:'relative'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',paddingLeft:'8px',paddingRight:'8px',background:'#444',borderTop:'2px solid #4d4d4d',borderBottom:'2px solid #333',height:'26px',whiteSpace:'nowrap'},on:{mousemove:[VIEW_HOVERED,nodeRef,{},1],touchmove:[HOVER_MOBILE]}},[(0,_h2.default)('span',{key:nodeId,style:{color:state.selectedViewNode.id===nodeId?'#53B2ED':'#bdbdbd',display:'inline-flex'},on:{click:[VIEW_NODE_SELECTED,nodeRef]}},[appIcon()]),state.editingTitleNodeId===nodeId?editingNode(nodeRef):(0,_h2.default)('span',{style:{flex:'1',cursor:'pointer',color:state.selectedViewNode.id===nodeId?'#53B2ED':'white',transition:'color 0.2s',paddingLeft:'2px'},on:{click:[VIEW_NODE_SELECTED,nodeRef],dblclick:[EDIT_VIEW_NODE_TITLE,nodeId]}},node.title)]),(0,_h2.default)('div',state.hoveredViewNode&&state.hoveredViewNode.parent.id===nodeId&&!(node.children.findIndex(function(ref){return ref.id===state.draggedComponentView.id;})===state.hoveredViewNode.position)?function(){// copy pasted from listBoxNode
var oldPosition=node.children.findIndex(function(ref){return ref.id===state.draggedComponentView.id;});var newPosition=oldPosition===-1||state.hoveredViewNode.position<oldPosition?state.hoveredViewNode.position:state.hoveredViewNode.position+1;var children=node.children.map(function(ref){return listNode(ref,nodeRef,1);});return children.slice(0,newPosition).concat(spacerComponent(),children.slice(newPosition));}():node.children.map(function(ref){return listNode(ref,nodeRef,1);})),(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',paddingLeft:'8px',paddingRight:'8px',height:'15px'},on:{mousemove:[VIEW_HOVERED,{id:'_lastNode'},{},1],touchmove:[HOVER_MOBILE]}})]);}function listBoxNode(nodeRef,parentRef,depth){var nodeId=nodeRef.id;var node=state.definition[nodeRef.ref][nodeId];return(0,_h2.default)('div',{style:{opacity:state.draggedComponentView&&state.draggedComponentView.id===nodeId?'0.5':'1.0'}},[(0,_h2.default)('div',{key:nodeId,style:{display:'flex',height:'26px',position:'relative',alignItems:'center',paddingLeft:(depth-(node.children.length>0||state.hoveredViewNode&&state.hoveredViewNode.parent.id===nodeId?1:0))*20+8+'px',paddingRight:'8px',background:'#444',borderTop:'2px solid #4d4d4d',borderBottom:'2px solid #333',whiteSpace:'nowrap',color:state.selectedViewNode.id===nodeId?'#53B2ED':'white'},on:{mousedown:[VIEW_DRAGGED,nodeRef,parentRef,depth],touchstart:[VIEW_DRAGGED,nodeRef,parentRef,depth],mousemove:[VIEW_HOVERED,nodeRef,parentRef,depth],touchmove:[HOVER_MOBILE]}},[node.children.length>0||state.hoveredViewNode&&state.hoveredViewNode.parent.id===nodeId?(0,_h2.default)('span',{style:{display:'inline-flex'}},[arrowIcon(state.viewFoldersClosed[nodeId]||state.draggedComponentView&&nodeId===state.draggedComponentView.id)]):(0,_h2.default)('span'),(0,_h2.default)('span',{key:nodeId,style:{display:'inline-flex',color:state.selectedViewNode.id===nodeId?'#53B2ED':'#bdbdbd',transition:'color 0.2s'}},[nodeRef.ref==='vNodeBox'?boxIcon():nodeRef.ref==='vNodeList'?listIcon():ifIcon()]),state.editingTitleNodeId===nodeId?editingNode(nodeRef):(0,_h2.default)('span',{style:{flex:'1',cursor:'pointer',transition:'color 0.2s',paddingLeft:'2px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'},on:{dblclick:[EDIT_VIEW_NODE_TITLE,nodeId]}},node.title),(0,_h2.default)('div',{style:{color:'#53B2ED',cursor:'pointer',display:state.selectedViewNode.id===nodeId?'inline-flex':'none',flex:'0 0 auto'}},[deleteIcon()])]),(0,_h2.default)('div',{style:{display:state.viewFoldersClosed[nodeId]||state.draggedComponentView&&nodeId===state.draggedComponentView.id?'none':'block'}},state.hoveredViewNode&&state.hoveredViewNode.parent.id===nodeId&&!(node.children.findIndex(function(ref){return ref.id===state.draggedComponentView.id;})===state.hoveredViewNode.position)?function(){// adds a fake component
var oldPosition=node.children.findIndex(function(ref){return ref.id===state.draggedComponentView.id;});// this is needed because we still show the old node
var newPosition=oldPosition===-1||state.hoveredViewNode.position<oldPosition?state.hoveredViewNode.position:state.hoveredViewNode.position+1;var children=node.children.map(function(ref){return listNode(ref,nodeRef,depth+1);});return children.slice(0,newPosition).concat(spacerComponent(),children.slice(newPosition));}():node.children.map(function(ref){return listNode(ref,nodeRef,depth+1);}))]);}function simpleNode(nodeRef,parentRef,depth){var nodeId=nodeRef.id;var node=state.definition[nodeRef.ref][nodeId];return(0,_h2.default)('div',{key:nodeId,style:{cursor:'pointer',opacity:state.draggedComponentView&&state.draggedComponentView.id===nodeId?'0.5':'1.0',position:'relative',height:'26px',paddingLeft:depth*20+8+'px',paddingRight:'8px',background:'#444',borderTop:'2px solid #4d4d4d',borderBottom:'2px solid #333',whiteSpace:'nowrap',display:'flex',alignItems:'center',color:state.selectedViewNode.id===nodeId?'#53B2ED':'#bdbdbd'},on:{mousedown:[VIEW_DRAGGED,nodeRef,parentRef,depth],touchstart:[VIEW_DRAGGED,nodeRef,parentRef,depth],dblclick:[EDIT_VIEW_NODE_TITLE,nodeId],mousemove:[VIEW_HOVERED,nodeRef,parentRef,depth],touchmove:[HOVER_MOBILE]}},[nodeRef.ref==='vNodeInput'?inputIcon():nodeRef.ref==='vNodeImage'?imageIcon():textIcon(),state.editingTitleNodeId===nodeId?editingNode(nodeRef):(0,_h2.default)('span',{style:{flex:'1',color:state.selectedViewNode.id===nodeId?'#53B2ED':'white',transition:'color 0.2s',paddingLeft:'2px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}},node.title),(0,_h2.default)('div',{style:{color:'#53B2ED',cursor:'pointer',display:state.selectedViewNode.id===nodeId?'inline-flex':'none',flex:'0 0 auto'}},[deleteIcon()])]);}function spacerComponent(){return(0,_h2.default)('div',{key:'spacer',style:{cursor:'pointer',height:'6px',boxShadow:'inset 0 0 1px 1px #53B2ED'}});}function fakeComponent(nodeRef,depth){var nodeId=nodeRef.id;var node=state.definition[nodeRef.ref][nodeId];return(0,_h2.default)('div',{key:'_fake'+nodeId,style:{cursor:'pointer',transition:'padding-left 0.2s',height:'26px',paddingLeft:(depth-(node.children&&node.children.length>0?1:0))*20+8+'px',paddingRight:'8px',background:'rgba(68,68,68,0.8)',borderTop:'2px solid #4d4d4d',borderBottom:'2px solid #333',whiteSpace:'nowrap',display:'flex',alignItems:'center',color:state.selectedViewNode.id===nodeId?'#53B2ED':'#bdbdbd'}},[(nodeRef.ref==='vNodeBox'||nodeRef.ref==='vNodeList'||nodeRef.ref==='vNodeIf')&&node.children.length>0?arrowIcon(true):(0,_h2.default)('span',{key:'_fakeSpan'+nodeId}),nodeRef.ref==='vNodeBox'?boxIcon():nodeRef.ref==='vNodeList'?listIcon():nodeRef.ref==='vNodeIf'?ifIcon():nodeRef.ref==='vNodeInput'?inputIcon():nodeRef.ref==='vNodeImage'?imageIcon():textIcon(),(0,_h2.default)('span',{style:{flex:'1',color:state.selectedViewNode.id===nodeId?'#53B2ED':'white',transition:'color 0.2s',paddingLeft:'2px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}},node.title)]);}function generateEditNodeComponent(){var styles=['background','border','outline','cursor','color','display','top','bottom','left','flex','justifyContent','alignItems','width','height','maxWidth','maxHeight','minWidth','minHeight','right','position','overflow','font','margin','padding'];var selectedNode=state.definition[state.selectedViewNode.ref][state.selectedViewNode.id];var propsComponent=(0,_h2.default)('div',{style:{background:state.selectedViewSubMenu==='props'?'#4d4d4d':'#3d3d3d',padding:'10px 0',flex:'1',cursor:'pointer',textAlign:'center'},on:{click:[SELECT_VIEW_SUBMENU,'props']}},'data');var styleComponent=(0,_h2.default)('div',{style:{background:state.selectedViewSubMenu==='style'?'#4d4d4d':'#3d3d3d',padding:'10px 0',flex:'1',borderRight:'1px solid #222',borderLeft:'1px solid #222',textAlign:'center',cursor:'pointer'},on:{click:[SELECT_VIEW_SUBMENU,'style']}},'style');var eventsComponent=(0,_h2.default)('div',{style:{background:state.selectedViewSubMenu==='events'?'#4d4d4d':'#3d3d3d',padding:'10px 0',flex:'1',textAlign:'center',cursor:'pointer'},on:{click:[SELECT_VIEW_SUBMENU,'events']}},'events');var genpropsSubmenuComponent=function genpropsSubmenuComponent(){return(0,_h2.default)('div',[function(){if(state.selectedViewNode.ref==='vNodeBox'){return(0,_h2.default)('div',{style:{textAlign:'center',marginTop:'100px',color:'#bdbdbd'}},'no data required');}if(state.selectedViewNode.ref==='vNodeText'){return(0,_h2.default)('div',{style:{overflow:'auto'},attrs:{"class":'better-scrollbar'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',background:'#676767',padding:'5px 10px',marginBottom:'10px'}},[(0,_h2.default)('span',{style:{flex:'1'}},'text value'),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:'#bdbdbd'}},'text')]),(0,_h2.default)('div',{style:{padding:'5px 10px'}},[emberEditor(selectedNode.value,'text')])]);}if(state.selectedViewNode.ref==='vNodeImage'){return(0,_h2.default)('div',{style:{overflow:'auto'},attrs:{"class":'better-scrollbar'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',background:'#676767',padding:'5px 10px',marginBottom:'10px'}},[(0,_h2.default)('span',{style:{flex:'1'}},'source (url)'),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:'#bdbdbd'}},'text')]),(0,_h2.default)('div',{style:{padding:'5px 10px'}},[emberEditor(selectedNode.src,'text')])]);}if(state.selectedViewNode.ref==='vNodeInput'){return(0,_h2.default)('div',{style:{overflow:'auto'},attrs:{"class":'better-scrollbar'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',background:'#676767',padding:'5px 10px',marginBottom:'10px'}},[(0,_h2.default)('span',{style:{flex:'1'}},'input value'),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:'#bdbdbd'}},'text')]),(0,_h2.default)('div',{style:{padding:'5px 10px'}},[emberEditor(selectedNode.value,'text')])]);}if(state.selectedViewNode.ref==='vNodeList'){return(0,_h2.default)('div',{style:{overflow:'auto'},attrs:{"class":'better-scrollbar'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',background:'#676767',padding:'5px 10px',marginBottom:'10px'}},[(0,_h2.default)('span',{style:{flex:'1'}},'table'),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:'#bdbdbd'}},'table')]),(0,_h2.default)('div',{style:{padding:'5px 10px'}},[emberEditor(selectedNode.value,'table')])]);}if(state.selectedViewNode.ref==='vNodeIf'){return(0,_h2.default)('div',{style:{overflow:'auto'},attrs:{"class":'better-scrollbar'}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',background:'#676767',padding:'5px 10px',marginBottom:'10px'}},[(0,_h2.default)('span',{style:{flex:'1'}},'predicate'),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:'#bdbdbd'}},'true/false')]),(0,_h2.default)('div',{style:{padding:'5px 10px'}},[emberEditor(selectedNode.value,'boolean')])]);}}()]);};var genstyleSubmenuComponent=function genstyleSubmenuComponent(){var selectedStyle=state.definition.style[selectedNode.style.id];return(0,_h2.default)('div',{attrs:{class:'better-scrollbar'},style:{overflow:'auto'}},[(0,_h2.default)('div',{style:{padding:'10px',fontFamily:"'Comfortaa', sans-serif",color:'#bdbdbd'}},'style panel will change a lot in 1.0v, right now it\'s just CSS')].concat(_toConsumableArray(Object.keys(selectedStyle).map(function(key){return(0,_h2.default)('div',{style:{}},[(0,_h2.default)('div',{style:{display:'flex',alignItems:'center',background:'#676767',padding:'5px 10px',marginBottom:'10px'}},[(0,_h2.default)('span',{style:{flex:'1'}},key),(0,_h2.default)('div',{style:{flex:'0',cursor:'default',color:'#bdbdbd'}},'text')]),(0,_h2.default)('div',{style:{padding:'5px 10px'}},[emberEditor(selectedStyle[key],'text')])]);})),[(0,_h2.default)('div',{style:{padding:'5px 10px',fontFamily:"'Comfortaa', sans-serif",color:'#bdbdbd'}},'add Style:'),(0,_h2.default)('div',{style:{padding:'5px 0 5px 10px'}},styles.filter(function(key){return!Object.keys(selectedStyle).includes(key);}).map(function(key){return(0,_h2.default)('div',{on:{click:[ADD_DEFAULT_STYLE,selectedNode.style.id,key]},style:{cursor:'pointer',border:'3px solid white',padding:'5px',marginTop:'5px'}},'+ '+key);}))]));};var geneventsSubmenuComponent=function geneventsSubmenuComponent(){var availableEvents=[{description:'on click',propertyName:'click'},{description:'double clicked',propertyName:'dblclick'},{description:'mouse over',propertyName:'mouseover'},{description:'mouse out',propertyName:'mouseout'}];if(state.selectedViewNode.ref==='vNodeInput'){availableEvents=availableEvents.concat([{description:'input',propertyName:'input'},{description:'focus',propertyName:'focus'},{description:'blur',propertyName:'blur'}]);}var currentEvents=availableEvents.filter(function(event){return selectedNode[event.propertyName];});var eventsLeft=availableEvents.filter(function(event){return!selectedNode[event.propertyName];});return(0,_h2.default)('div',{style:{paddingTop:'20px'}},[].concat(_toConsumableArray(currentEvents.length?currentEvents.map(function(eventDesc){var event=state.definition[selectedNode[eventDesc.propertyName].ref][selectedNode[eventDesc.propertyName].id];return(0,_h2.default)('div',[(0,_h2.default)('div',{style:{background:'#676767',padding:'5px 10px'}},event.type),(0,_h2.default)('div',{style:{color:'white',transition:'color 0.2s',fontSize:'14px',cursor:'pointer',padding:'5px 10px'}},event.mutators.map(function(mutatorRef){var mutator=state.definition[mutatorRef.ref][mutatorRef.id];var stateDef=state.definition[mutator.state.ref][mutator.state.id];return(0,_h2.default)('div',{style:{marginTop:'10px'}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',display:'inline-block',position:'relative',transform:'translateZ(0)',boxShadow:'inset 0 0 0 2px '+(state.selectedStateNodeId===mutator.state.id?'#eab65c':'#828282'),background:'#444',padding:'4px 7px'}},[(0,_h2.default)('span',{style:{color:'white',display:'inline-block'},on:{click:[STATE_NODE_SELECTED,mutator.state.id]}},stateDef.title)]),emberEditor(mutator.mutation,stateDef.type)]);}))]);}):[]),[(0,_h2.default)('div',{style:{padding:'5px 10px',fontFamily:"'Comfortaa', sans-serif",color:'#bdbdbd'}},'add Event:'),(0,_h2.default)('div',{style:{padding:'5px 0 5px 10px'}},[].concat(_toConsumableArray(eventsLeft.map(function(event){return(0,_h2.default)('div',{style:{border:'3px solid #5bcc5b',cursor:'pointer',padding:'5px',margin:'10px'},on:{click:[ADD_EVENT,event.propertyName,state.selectedViewNode]}},'+ '+event.description);}))))]));};var fullVNode=['vNodeBox','vNodeText','vNodeImage','vNodeInput'].includes(state.selectedViewNode.ref);return(0,_h2.default)('div',{style:{position:'fixed',font:"300 1.2em 'Open Sans'",lineHeight:'1.2em',color:'white',left:state.componentEditorPosition.x+'px',top:state.componentEditorPosition.y+'px',height:'50%',display:'flex',zIndex:'3000'}},[(0,_h2.default)('div',{style:{flex:'1',display:'flex',marginBottom:'10px',flexDirection:'column',background:'#4d4d4d',width:state.subEditorWidth+'px',border:'3px solid #222'}},[(0,_h2.default)('div',{style:{flex:'0 0 auto'}},[(0,_h2.default)('div',{style:{display:'flex',cursor:'default',alignItems:'center',background:'#222',paddingTop:'2px',paddingBottom:'5px',color:'#53B2ED',minWidth:'100%'},on:{mousedown:[COMPONENT_VIEW_DRAGGED],touchstart:[COMPONENT_VIEW_DRAGGED]}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',margin:'0 2px 0 5px',display:'inline-flex'}},[state.selectedViewNode.id==='_rootNode'?appIcon():state.selectedViewNode.ref==='vNodeBox'?boxIcon():state.selectedViewNode.ref==='vNodeList'?listIcon():state.selectedViewNode.ref==='vNodeList'?ifIcon():state.selectedViewNode.ref==='vNodeInput'?inputIcon():state.selectedViewNode.ref==='vNodeImage'?imageIcon():textIcon()]),(0,_h2.default)('span',{style:{flex:'5 5 auto',margin:'0 5px 0 0',minWidth:'0',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',fontSize:'0.8em'}},selectedNode.title),(0,_h2.default)('span',{style:{flex:'0 0 auto',marginLeft:'auto',cursor:'pointer',marginRight:'5px',color:'white',display:'inline-flex'},on:{mousedown:[UNSELECT_VIEW_NODE,false,true],touchstart:[UNSELECT_VIEW_NODE,false,true]}},[clearIcon()])])]),fullVNode?(0,_h2.default)('div',{style:{display:'flex',flex:'0 0 auto',fontFamily:"'Comfortaa', sans-serif"}},[propsComponent,styleComponent,eventsComponent]):(0,_h2.default)('span'),dragSubComponentRight,dragSubComponentLeft,state.selectedViewSubMenu==='props'||!fullVNode?genpropsSubmenuComponent():state.selectedViewSubMenu==='style'?genstyleSubmenuComponent():state.selectedViewSubMenu==='events'?geneventsSubmenuComponent():(0,_h2.default)('span','Error, no such menu')])]);}var addStateComponent=(0,_h2.default)('div',{style:{flex:'0 auto',marginLeft:state.rightOpen?'-10px':'0',border:'3px solid #222',borderRight:'none',background:'#333',height:'40px',display:'flex',alignItems:'center'}},[(0,_h2.default)('span',{style:{fontFamily:"'Comfortaa', sans-serif",fontSize:'0.9em',cursor:'pointer',padding:'0 5px'}},'add state: '),(0,_h2.default)('span',{style:{display:'inline-block'},on:{click:[ADD_STATE,'_rootNameSpace','text']}},[textIcon()]),(0,_h2.default)('span',{on:{click:[ADD_STATE,'_rootNameSpace','number']}},[numberIcon()]),(0,_h2.default)('span',{on:{click:[ADD_STATE,'_rootNameSpace','boolean']}},[ifIcon()])]);var addViewNodeComponent=(0,_h2.default)('div',{style:{flex:'0 auto',marginLeft:state.rightOpen?'-10px':'0',border:'3px solid #222',borderRight:'none',background:'#333',height:'40px',display:'flex',alignItems:'center'}},[(0,_h2.default)('span',{style:{fontFamily:"'Comfortaa', sans-serif",fontSize:'0.9em',padding:'0 10px'}},'add component: '),(0,_h2.default)('span',{on:{click:[ADD_NODE,state.selectedViewNode,'box']}},[boxIcon()]),(0,_h2.default)('span',{on:{click:[ADD_NODE,state.selectedViewNode,'input']}},[inputIcon()]),(0,_h2.default)('span',{on:{click:[ADD_NODE,state.selectedViewNode,'text']}},[textIcon()]),(0,_h2.default)('span',{on:{click:[ADD_NODE,state.selectedViewNode,'image']}},[imageIcon()]),(0,_h2.default)('span',{on:{click:[ADD_NODE,state.selectedViewNode,'if']}},[ifIcon()])]);var viewComponent=(0,_h2.default)('div',{attrs:{class:'better-scrollbar'},style:{overflow:'auto',position:'relative',flex:'1',fontSize:'0.8em'},on:{click:[UNSELECT_VIEW_NODE,true,false]}},[listNode({ref:'vNodeBox',id:'_rootNode'},{},0)]);var rightComponent=(0,_h2.default)('div',{style:{display:'flex',flexDirection:'column',position:'absolute',top:'0',right:'0',color:'white',height:'100%',font:"300 1.2em 'Open Sans'",lineHeight:'1.2em',width:state.editorRightWidth+'px',background:'#4d4d4d',boxSizing:"border-box",borderLeft:'3px solid #222',transition:'0.5s transform',transform:state.rightOpen?'translateZ(0) translateX(0%)':'translateZ(0) translateX(100%)',userSelect:'none'}},[dragComponentRight,openComponentRight,addStateComponent,stateComponent,addViewNodeComponent,viewComponent]);var topComponent=(0,_h2.default)('div',{style:{flex:'1 auto',height:'75px',maxHeight:'75px',minHeight:'75px',background:'#222',display:'flex',justifyContent:'center',fontFamily:"'Comfortaa', sans-serif"}},[(0,_h2.default)('a',{style:{flex:'0 auto',width:'190px',textDecoration:'inherit',userSelect:'none'},attrs:{href:'/_dev'}},[(0,_h2.default)('img',{style:{margin:'7px -2px -3px 5px',display:'inline-block'},attrs:{src:'/images/logo256x256.png',height:'57'}}),(0,_h2.default)('span',{style:{fontSize:'44px',verticalAlign:'bottom',color:'#fff'}},'ugnis')]),(0,_h2.default)('div',{style:{position:'absolute',top:'0',right:'0',border:'none',color:'white',fontFamily:"'Comfortaa', sans-serif",fontSize:'16px'}},[(0,_h2.default)('div',{style:{background:'#444444',border:'none',color:'white',display:'inline-block',padding:'15px 20px',margin:'13px 13px 0 0',cursor:'pointer'},on:{click:[FULL_SCREEN_CLICKED,true]}},'full screen'),(0,_h2.default)('div',{style:{background:'#444444',border:'none',color:'white',display:'inline-block',padding:'15px 20px',margin:'13px 13px 0 0',cursor:'pointer'},on:{click:RESET_APP_STATE}},'reset state'),(0,_h2.default)('div',{style:{background:'#444444',border:'none',color:'white',display:'inline-block',padding:'15px 20px',margin:'13px 13px 0 0',cursor:'pointer'},on:{click:RESET_APP_DEFINITION}},'reset demo')])]);var leftComponent=(0,_h2.default)('div',{style:{display:'flex',flexDirection:'column',position:'absolute',top:'0',left:'0',height:'100%',color:'white',font:"300 1.2em 'Open Sans'",width:state.editorLeftWidth+'px',background:'#4d4d4d',boxSizing:"border-box",borderRight:'3px solid #222',transition:'0.5s transform',transform:state.leftOpen?'translateZ(0) translateX(0%)':'translateZ(0) translateX(-100%)',userSelect:'none'}},[dragComponentLeft,openComponentLeft,(0,_h2.default)('div',{on:{click:FREEZER_CLICKED},style:{flex:'0 auto',padding:'10px',textAlign:'center',background:'#333',cursor:'pointer'}},[(0,_h2.default)('span',{style:{padding:'15px 15px 10px 15px',color:state.appIsFrozen?'rgb(91, 204, 91)':'rgb(204, 91, 91)'}},state.appIsFrozen?'►':'❚❚')]),(0,_h2.default)('div',{attrs:{class:'better-scrollbar'},style:{flex:'1 auto',overflow:'auto'}},state.eventStack.filter(function(eventData){return state.definition.event[eventData.eventId]!==undefined;}).reverse()// mutates the array, but it was already copied with filter
.map(function(eventData,index){var event=state.definition.event[eventData.eventId];var emitter=state.definition[event.emitter.ref][event.emitter.id];// no idea why this key works, don't touch it, probably rerenders more than needed, but who cares
return(0,_h2.default)('div',{key:event.emitter.id+index,style:{marginBottom:'10px'}},[(0,_h2.default)('div',{style:{display:'flex',marginBottom:'10px',cursor:'pointer',alignItems:'center',background:'#444',paddingTop:'3px',paddingBottom:'3px',color:state.selectedViewNode.id===event.emitter.id?'#53B2ED':'white',transition:'0.2s all',minWidth:'100%'},on:{click:[VIEW_NODE_SELECTED,event.emitter]}},[(0,_h2.default)('span',{style:{flex:'0 0 auto',margin:'0 0 0 5px',display:'inline-flex'}},[event.emitter.ref==='vNodeBox'?boxIcon():event.emitter.ref==='vNodeList'?listIcon():event.emitter.ref==='vNodeList'?ifIcon():event.emitter.ref==='vNodeInput'?inputIcon():textIcon()]),(0,_h2.default)('span',{style:{flex:'5 5 auto',margin:'0 5px 0 0',minWidth:'0',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}},emitter.title),(0,_h2.default)('span',{style:{flex:'0 0 auto',fontFamily:"'Comfortaa', sans-serif",fontSize:'0.9em',marginLeft:'auto',marginRight:'5px',color:'#5bcc5b'}},event.type)]),Object.keys(eventData.mutations).length===0?(0,_h2.default)('div',{style:{padding:'5px 10px',fontFamily:"'Comfortaa', sans-serif",color:'#bdbdbd'}},'nothing has changed'):(0,_h2.default)('div',{style:{paddingLeft:'10px',whiteSpace:'nowrap'}},Object.keys(eventData.mutations).filter(function(stateId){return state.definition.state[stateId]!==undefined;}).map(function(stateId){return(0,_h2.default)('span',[(0,_h2.default)('span',{on:{click:[STATE_NODE_SELECTED,stateId]},style:{cursor:'pointer',fontSize:'14px',color:'white',boxShadow:'inset 0 0 0 2px '+(state.selectedStateNodeId===stateId?'#eab65c':'#828282'),background:'#444',padding:'2px 5px',marginRight:'5px',display:'inline-block',transition:'all 0.2s'}},state.definition.state[stateId].title),(0,_h2.default)('span',{style:{color:'#8e8e8e'}},eventData.previousState[stateId].toString()+' –› '),(0,_h2.default)('span',eventData.mutations[stateId].toString())]);}))]);}))]);var renderViewComponent=(0,_h2.default)('div',{style:{flex:'1 auto',//backgroundImage: 'radial-gradient(black 15%, transparent 16%), radial-gradient(black 15%, transparent 16%), radial-gradient(rgba(255, 255, 255, 0.0980392) 15%, transparent 20%), radial-gradient(rgba(255, 255, 255, 0.0980392) 15%, transparent 20%)',
backgroundPositionX:'0px, 8px, 0px, 8px',backgroundPositionY:'0px, 8px, 1px, 9px',backgroundColor:'#333',backgroundSize:'16px 16px',display:'relative',overflow:'auto'}},[(0,_h2.default)('div',{style:function(){var topMenuHeight=75;var widthLeft=window.innerWidth-((state.leftOpen?state.editorLeftWidth:0)+(state.rightOpen?state.editorRightWidth:0));var heightLeft=window.innerHeight-topMenuHeight;return{width:state.fullScreen?'100vw':widthLeft-40+'px',height:state.fullScreen?'100vh':heightLeft-40+'px',background:'#ffffff',zIndex:state.fullScreen?'2000':'100',boxShadow:'rgba(0, 0, 0, 0.247059) 0px 14px 45px, rgba(0, 0, 0, 0.219608) 0px 10px 18px',position:'fixed',transition:'all 0.5s',top:state.fullScreen?'0px':20+75+'px',left:state.fullScreen?'0px':(state.leftOpen?state.editorLeftWidth:0)+20+'px'};}()},[state.fullScreen?(0,_h2.default)('span',{style:{position:'fixed',padding:'12px 10px',top:'0',right:'20px',border:'2px solid #333',borderTop:'none',background:'#444',color:'white',opacity:'0.8',cursor:'pointer'},on:{click:[FULL_SCREEN_CLICKED,false]}},'exit full screen'):(0,_h2.default)('span'),(0,_h2.default)('div',{style:{overflow:'auto',width:'100%',height:'100%'}},[app.vdom])])]);var mainRowComponent=(0,_h2.default)('div',{style:{display:'flex',flex:'1',position:'relative'}},[renderViewComponent,leftComponent,rightComponent,state.selectedViewNode.ref?generateEditNodeComponent():(0,_h2.default)('span')]);var vnode=(0,_h2.default)('div',{style:{display:'flex',flexDirection:'column',position:'fixed',top:'0',right:'0',width:'100vw',height:'100vh'}},[topComponent,mainRowComponent,state.draggedComponentView?(0,_h2.default)('div',{style:{fontFamily:"Open Sans",pointerEvents:'none',position:'fixed',top:state.mousePosition.y+'px',left:state.mousePosition.x+'px',lineHeight:'1.2em',fontSize:'1.2em',zIndex:'99999',width:state.editorRightWidth+'px'}},[(0,_h2.default)('div',{style:{overflow:'auto',position:'relative',flex:'1',fontSize:'0.8em'}},[fakeComponent(state.draggedComponentView,state.hoveredViewNode?state.hoveredViewNode.depth:state.draggedComponentView.depth)])]):(0,_h2.default)('span'),state.draggedComponentStateId?(0,_h2.default)('div',{style:{fontFamily:"Open Sans",pointerEvents:'none',position:'fixed',top:state.mousePosition.y+'px',left:state.mousePosition.x+'px',lineHeight:'1.2em',fontSize:'16px',zIndex:'99999',width:state.editorRightWidth+'px'}},[fakeState(state.draggedComponentStateId)]):(0,_h2.default)('span')]);node=patch(node,vnode);currentAnimationFrameRequest=null;}render();}

},{"../node_modules/big.js":1,"../ugnis_components/app.json":15,"./ugnis":14,"fastclick":2,"snabbdom":11,"snabbdom/h":3,"snabbdom/modules/attributes":6,"snabbdom/modules/class":7,"snabbdom/modules/eventlisteners":8,"snabbdom/modules/props":9,"snabbdom/modules/style":10}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _snabbdom = require('snabbdom');

var _snabbdom2 = _interopRequireDefault(_snabbdom);

var _h = require('snabbdom/h');

var _h2 = _interopRequireDefault(_h);

var _big = require('big.js');

var _big2 = _interopRequireDefault(_big);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateProps(oldVnode, vnode) {
    var key,
        cur,
        old,
        elm = vnode.elm,
        props = vnode.data.liveProps || {};
    for (key in props) {
        cur = props[key];
        old = elm[key];
        if (old !== cur) elm[key] = cur;
    }
}
var livePropsPlugin = { create: updateProps, update: updateProps };

var patch = _snabbdom2.default.init([require('snabbdom/modules/class'), require('snabbdom/modules/props'), require('snabbdom/modules/style'), require('snabbdom/modules/eventlisteners'), require('snabbdom/modules/attributes'), livePropsPlugin]);


function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
        return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
}

exports.default = function (definition) {

    var currentState = createDefaultState();

    // Allows stoping application in development. This is not an application state
    var frozen = false;
    var frozenCallback = null;
    var selectHoverActive = false;
    var selectedNodeInDevelopment = {};

    function selectNodeHover(ref, e) {
        e.stopPropagation();
        selectedNodeInDevelopment = ref;
        frozenCallback(ref);
        render();
    }
    function selectNodeClick(ref, e) {
        e.stopPropagation();
        selectHoverActive = false;
        selectedNodeInDevelopment = ref;
        frozenCallback(ref);
        render();
    }

    // global state for resolver
    var currentEvent = null;
    var currentMapValue = {};
    var currentMapIndex = {};
    var eventData = {};
    function resolve(ref) {
        if (ref === undefined) {
            return;
        }
        // static value (string/number)
        if (ref.ref === undefined) {
            return ref;
        }
        var def = definition[ref.ref][ref.id];
        if (ref.ref === 'pipe') {
            return pipe(ref);
        }
        if (ref.ref === 'conditional') {
            return resolve(def.predicate) ? resolve(def.then) : resolve(def.else);
        }
        if (ref.ref === 'state') {
            return currentState[ref.id];
        }
        if (ref.ref === 'vNodeBox') {
            return boxNode(ref);
        }
        if (ref.ref === 'vNodeText') {
            return textNode(ref);
        }
        if (ref.ref === 'vNodeInput') {
            return inputNode(ref);
        }
        if (ref.ref === 'vNodeList') {
            return listNode(ref);
        }
        if (ref.ref === 'vNodeIf') {
            return ifNode(ref);
        }
        if (ref.ref === 'vNodeImage') {
            return imageNode(ref);
        }
        if (ref.ref === 'style') {
            return Object.keys(def).reduce(function (acc, val) {
                acc[val] = resolve(def[val]);
                return acc;
            }, {});
        }
        if (ref.ref === 'eventData') {
            return eventData[ref.id];
        }
        if (ref.ref === 'listValue') {
            return currentMapValue[def.list.id][def.property];
        }
        throw Error(ref);
    }

    function transformValue(value, transformations) {
        for (var i = 0; i < transformations.length; i++) {
            var ref = transformations[i];
            var transformer = definition[ref.ref][ref.id];
            if (ref.ref === 'equal') {
                var compareValue = resolve(transformer.value);
                if (value instanceof _big2.default || compareValue instanceof _big2.default) {
                    value = (0, _big2.default)(value).eq(compareValue);
                } else {
                    value = value === compareValue;
                }
            }
            if (ref.ref === 'add') {
                value = (0, _big2.default)(value).plus(resolve(transformer.value));
            }
            if (ref.ref === 'subtract') {
                value = (0, _big2.default)(value).minus(resolve(transformer.value));
            }
            if (ref.ref === 'multiply') {
                value = (0, _big2.default)(value).times(resolve(transformer.value));
            }
            if (ref.ref === 'divide') {
                value = (0, _big2.default)(value).div(resolve(transformer.value));
            }
            if (ref.ref === 'remainder') {
                value = (0, _big2.default)(value).mod(resolve(transformer.value));
            }
            if (ref.ref === 'branch') {
                if (resolve(transformer.predicate)) {
                    value = transformValue(value, transformer.then);
                } else {
                    value = transformValue(value, transformer.else);
                }
            }
            if (ref.ref === 'join') {
                value = value.concat(resolve(transformer.value));
            }
            if (ref.ref === 'toUpperCase') {
                value = value.toUpperCase();
            }
            if (ref.ref === 'toLowerCase') {
                value = value.toLowerCase();
            }
            if (ref.ref === 'toText') {
                value = value.toString();
            }
        }
        return value;
    }

    function pipe(ref) {
        var def = definition[ref.ref][ref.id];
        return transformValue(resolve(def.value), def.transformations);
    }

    var frozenShadow = 'inset 0 0 0 3px #3590df';

    function boxNode(ref) {
        var node = definition[ref.ref][ref.id];
        var style = resolve(node.style);
        var data = {
            style: frozen && selectedNodeInDevelopment.id === ref.id ? _extends({}, style, { transition: 'box-shadow 0.2s', boxShadow: style.boxShadow ? style.boxShadow + ' , ' + frozenShadow : frozenShadow }) : style,
            on: frozen ? {
                mouseover: selectHoverActive ? [selectNodeHover, ref] : undefined,
                click: [selectNodeClick, ref]
            } : {
                click: node.click ? [emitEvent, node.click] : undefined,
                dblclick: node.dblclick ? [emitEvent, node.dblclick] : undefined,
                mouseover: node.mouseover ? [emitEvent, node.mouseover] : undefined,
                mouseout: node.mouseout ? [emitEvent, node.mouseout] : undefined
            }
        };
        return (0, _h2.default)('div', data, flatten(node.children.map(resolve)));
    }

    function ifNode(ref) {
        var node = definition[ref.ref][ref.id];
        return resolve(node.value) ? node.children.map(resolve) : [];
    }

    function textNode(ref) {
        var node = definition[ref.ref][ref.id];
        var style = resolve(node.style);
        var data = {
            style: frozen && selectedNodeInDevelopment.id === ref.id ? _extends({}, style, { transition: 'box-shadow 0.2s', boxShadow: style.boxShadow ? style.boxShadow + ' , ' + frozenShadow : frozenShadow }) : style,
            on: frozen ? {
                mouseover: selectHoverActive ? [selectNodeHover, ref] : undefined,
                click: [selectNodeClick, ref]
            } : {
                click: node.click ? [emitEvent, node.click] : undefined,
                dblclick: node.dblclick ? [emitEvent, node.dblclick] : undefined,
                mouseover: node.mouseover ? [emitEvent, node.mouseover] : undefined,
                mouseout: node.mouseout ? [emitEvent, node.mouseout] : undefined
            }
        };
        return (0, _h2.default)('span', data, resolve(node.value));
    }

    function imageNode(ref) {
        var node = definition[ref.ref][ref.id];
        var style = resolve(node.style);
        var data = {
            attrs: {
                src: resolve(node.src)
            },
            style: frozen && selectedNodeInDevelopment.id === ref.id ? _extends({}, style, { transition: 'box-shadow 0.2s', boxShadow: style.boxShadow ? style.boxShadow + ' , ' + frozenShadow : frozenShadow }) : style,
            on: frozen ? {
                mouseover: selectHoverActive ? [selectNodeHover, ref] : undefined,
                click: [selectNodeClick, ref]
            } : {
                click: node.click ? [emitEvent, node.click] : undefined,
                dblclick: node.dblclick ? [emitEvent, node.dblclick] : undefined,
                mouseover: node.mouseover ? [emitEvent, node.mouseover] : undefined,
                mouseout: node.mouseout ? [emitEvent, node.mouseout] : undefined
            }
        };
        return (0, _h2.default)('img', data);
    }

    function inputNode(ref) {
        var node = definition[ref.ref][ref.id];
        var style = resolve(node.style);
        var data = {
            style: frozen && selectedNodeInDevelopment.id === ref.id ? _extends({}, style, { transition: 'box-shadow 0.2s', boxShadow: style.boxShadow ? style.boxShadow + ' , ' + frozenShadow : frozenShadow }) : style,
            on: frozen ? {
                mouseover: selectHoverActive ? [selectNodeHover, ref] : undefined,
                click: [selectNodeClick, ref]
            } : {
                click: node.click ? [emitEvent, node.click] : undefined,
                input: node.input ? [emitEvent, node.input] : undefined,
                dblclick: node.dblclick ? [emitEvent, node.dblclick] : undefined,
                mouseover: node.mouseover ? [emitEvent, node.mouseover] : undefined,
                mouseout: node.mouseout ? [emitEvent, node.mouseout] : undefined,
                focus: node.focus ? [emitEvent, node.focus] : undefined,
                blur: node.blur ? [emitEvent, node.blur] : undefined
            },
            props: {
                value: resolve(node.value),
                placeholder: node.placeholder
            }
        };
        return (0, _h2.default)('input', data);
    }

    function listNode(ref) {
        var node = definition[ref.ref][ref.id];
        var list = resolve(node.value);

        var children = Object.keys(list).map(function (key) {
            return list[key];
        }).map(function (value, index) {
            currentMapValue[ref.id] = value;
            currentMapIndex[ref.id] = index;

            return node.children.map(resolve);
        });
        delete currentMapValue[ref.id];
        delete currentMapIndex[ref.id];

        return children;
    }

    var listeners = [];

    function addListener(callback) {
        var length = listeners.push(callback);

        // for unsubscribing
        return function () {
            return listeners.splice(length - 1, 1);
        };
    }

    function emitEvent(eventRef, e) {
        var eventId = eventRef.id;
        var event = definition.event[eventId];
        currentEvent = e;
        event.data.forEach(function (ref) {
            if (ref.id === '_input') {
                eventData[ref.id] = e.target.value;
            }
        });
        var previousState = currentState;
        var mutations = {};
        definition.event[eventId].mutators.forEach(function (ref) {
            var mutator = definition.mutator[ref.id];
            var state = mutator.state;
            mutations[state.id] = resolve(mutator.mutation);
        });
        currentState = Object.assign({}, currentState, mutations);
        listeners.forEach(function (callback) {
            return callback(eventId, eventData, e, previousState, currentState, mutations);
        });
        currentEvent = {};
        eventData = {};
        if (Object.keys(mutations).length) {
            render();
        }
    }

    var vdom = resolve({ ref: 'vNodeBox', id: '_rootNode' });
    function render(newDefinition) {
        if (newDefinition) {
            if (definition.state !== newDefinition.state) {
                definition = newDefinition;
                var newState = Object.keys(definition.state).map(function (key) {
                    return definition.state[key];
                }).reduce(function (acc, def) {
                    acc[def.ref] = def.defaultValue;
                    return acc;
                }, {});
                currentState = _extends({}, newState, currentState);
            } else {
                definition = newDefinition;
            }
        }
        var newvdom = resolve({ ref: 'vNodeBox', id: '_rootNode' });
        patch(vdom, newvdom);
        vdom = newvdom;
    }

    function _freeze(isFrozen, callback, nodeId) {
        frozenCallback = callback;
        selectedNodeInDevelopment = nodeId;
        if (frozen === false && isFrozen === true) {
            selectHoverActive = true;
        }
        if (frozen || frozen !== isFrozen) {
            frozen = isFrozen;
            render();
        }
    }

    function getCurrentState() {
        return currentState;
    }

    function setCurrentState(newState) {
        currentState = newState;
        render();
    }

    function createDefaultState() {
        return Object.keys(definition.state).map(function (key) {
            return definition.state[key];
        }).reduce(function (acc, def) {
            acc[def.ref] = def.defaultValue;
            return acc;
        }, {});
    }

    return {
        definition: definition,
        vdom: vdom,
        getCurrentState: getCurrentState,
        setCurrentState: setCurrentState,
        render: render,
        emitEvent: emitEvent,
        addListener: addListener,
        _freeze: _freeze,
        _resolve: resolve,
        createDefaultState: createDefaultState
    };
};

},{"big.js":1,"snabbdom":11,"snabbdom/h":3,"snabbdom/modules/attributes":6,"snabbdom/modules/class":7,"snabbdom/modules/eventlisteners":8,"snabbdom/modules/props":9,"snabbdom/modules/style":10}],15:[function(require,module,exports){
module.exports={
  "eventData": {
    "_input": {
      "title": "input value",
      "type": "text"
    }
  },
  "toLowerCase": {},
  "toUpperCase": {},
  "conditional": {},
  "equal": {
    "a7251af0-50a7-4823-85a0-66ce09d8a3cc": {
      "value": {
        "ref": "pipe",
        "id": "ee2423e6-5b48-41ae-8ccf-6a2c7b46d2f8"
      }
    }
  },
  "not": {},
  "list": {},
  "toText": {
    "7bs9d6d2-00db-8ab5-c332-882575f25426": {}
  },
  "listValue": {
    "pz7hd6d2-00db-8ab5-c332-882575f25426": {
      "type": "number",
      "list": {
        "ref": "vNodeList",
        "id": "fl89d6d2-00db-8ab5-c332-882575f25425"
      },
      "property": "x"
    },
    "hj9wd6d2-00db-8ab5-c332-882575f25426": {
      "type": "number",
      "list": {
        "ref": "vNodeList",
        "id": "fl89d6d2-00db-8ab5-c332-882575f25425"
      },
      "property": "y"
    },
    "hhr8b6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "list": {
        "ref": "vNodeList",
        "id": "fl89d6d2-00db-8ab5-c332-882575f25425"
      },
      "property": "color"
    }
  },
  "pipe": {
    "fw8jd6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": "Number currently is: ",
      "transformations": [
        {
          "ref": "join",
          "id": "p9s3d6d2-00db-8ab5-c332-882575f25426"
        },
        {
          "ref": "join",
          "id": "8a6cd6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "um5ed6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": {
        "ref": "state",
        "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": [
        {
          "ref": "toText",
          "id": "7bs9d6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "ui8jd6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": "+",
      "transformations": []
    },
    "c8wed6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": "-",
      "transformations": []
    },
    "pdq6d6d2-00db-8ab5-c332-882575f25426": {
      "type": "number",
      "value": {
        "ref": "state",
        "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": [
        {
          "ref": "add",
          "id": "w86fd6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "452qd6d2-00db-8ab5-c332-882575f25426": {
      "type": "number",
      "value": {
        "ref": "state",
        "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": [
        {
          "ref": "subtract",
          "id": "u43wd6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "ew83d6d2-00db-8ab5-c332-882575f25426": {
      "type": "number",
      "value": 1,
      "transformations": []
    },
    "w3e9d6d2-00db-8ab5-c332-882575f25426": {
      "type": "number",
      "value": 1,
      "transformations": []
    },
    "3qkid6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": 0,
      "transformations": [
        {
          "ref": "add",
          "id": "wbr7d6d2-00db-8ab5-c332-882575f25426"
        },
        {
          "ref": "toText",
          "id": "noop"
        },
        {
          "ref": "join",
          "id": "s258d6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "t7vqd6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": 0,
      "transformations": [
        {
          "ref": "add",
          "id": "vq8dd6d2-00db-8ab5-c332-882575f25426"
        },
        {
          "ref": "toText",
          "id": "noop"
        },
        {
          "ref": "join",
          "id": "wf9ad6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "7dbvd6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": {
        "ref": "listValue",
        "id": "hj9wd6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": []
    },
    "8d4vd6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": {
        "ref": "listValue",
        "id": "pz7hd6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": []
    },
    "8cq6b6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": {
        "ref": "listValue",
        "id": "hhr8b6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": []
    },
    "f9qxd6d2-00db-8ab5-c332-882575f25426": {
      "type": "table",
      "value": {
        "ref": "state",
        "id": "c8q9d6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": []
    },
    "qww9d6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": "px",
      "transformations": []
    },
    "qdw7c6d2-00db-8ab5-c332-882575f25426": {
      "type": "text",
      "value": "px",
      "transformations": []
    },
    "84369aba-4a4d-4932-8a9a-8f9ca948b6a2": {
      "type": "text",
      "value": "The number is even 🎉",
      "transformations": []
    },
    "c2fb9a9b-25bb-4e8b-80c0-cf51b8506070": {
      "type": "boolean",
      "value": {
        "ref": "state",
        "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
      },
      "transformations": [
        {
          "ref": "remainder",
          "id": "34780d22-f521-4c30-89a5-3e7f5b5af7c2"
        },
        {
          "ref": "equal",
          "id": "a7251af0-50a7-4823-85a0-66ce09d8a3cc"
        }
      ]
    },
    "1229d478-bc25-4401-8a89-74fc6cfe8996": {
      "type": "number",
      "value": 2,
      "transformations": []
    },
    "ee2423e6-5b48-41ae-8ccf-6a2c7b46d2f8": {
      "type": "number",
      "value": 0,
      "transformations": []
    },
    "945f0818-7743-4edd-8c76-3dd5a8ba7fa9": {
      "type": "text",
      "value": "'Comfortaa', cursive",
      "transformations": []
    },
    "a60899ee-9925-4e05-890e-b9428b02dbf9": {
      "type": "text",
      "value": "#f5f5f5",
      "transformations": []
    },
    "1e465403-5382-4a45-89da-8d88e2eb2fb9": {
      "type": "text",
      "value": "100%",
      "transformations": []
    },
    "ef2ec184-199f-4ee8-8e30-b99dbc1df5db": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "fab286c4-ded3-4a5e-8749-7678abcbb125": {
      "type": "text",
      "value": "10px 5px",
      "transformations": []
    },
    "703f8e02-c5c3-4d27-8ca2-722c4d0d1ea0": {
      "type": "text",
      "value": "10px 15px",
      "transformations": []
    },
    "8f3c6630-d8d9-4bc1-8a3d-ba4dad3091f0": {
      "type": "text",
      "value": "#aaaaaa",
      "transformations": []
    },
    "d31c4746-2329-4404-8689-fbf2393efd44": {
      "type": "text",
      "value": "inline-block",
      "transformations": []
    },
    "41685adc-3793-4566-8f61-2c2a42fdf86e": {
      "type": "text",
      "value": "5px",
      "transformations": []
    },
    "d5754fdb-4689-4f87-87fc-51d60022b32c": {
      "type": "text",
      "value": "3px",
      "transformations": []
    },
    "0bc6a18c-1766-42bd-8b4a-202a2b0c34fe": {
      "type": "text",
      "value": "pointer",
      "transformations": []
    },
    "9b250ef8-c1be-4706-8a71-f444f18f0f82": {
      "type": "text",
      "value": "none",
      "transformations": []
    },
    "b0a10497-ec26-4ff7-8739-a193755cbcae": {
      "type": "text",
      "value": "10px 5px",
      "transformations": []
    },
    "8764e258-599d-4252-8112-d06fcd0d5e2a": {
      "type": "text",
      "value": "10px 15px",
      "transformations": []
    },
    "8caaf876-10bc-47de-89d9-869c892cd4ce": {
      "type": "text",
      "value": "#999999",
      "transformations": []
    },
    "ae987bba-734a-46ae-8c82-c04896221179": {
      "type": "text",
      "value": "inline-block",
      "transformations": []
    },
    "f0090f8d-87b4-4d83-8a53-039b21e2b594": {
      "type": "text",
      "value": "5px",
      "transformations": []
    },
    "b7c791a6-2c91-4b62-8820-dbaaf9d5c179": {
      "type": "text",
      "value": "3px",
      "transformations": []
    },
    "d795a510-ccf9-4d92-81ee-5e512b81ee58": {
      "type": "text",
      "value": "pointer",
      "transformations": []
    },
    "7518524a-0bc2-465c-814e-0a5d39de25e3": {
      "type": "text",
      "value": "10px 5px",
      "transformations": []
    },
    "b24b1c18-8a82-4c8f-8180-6d062c78c9d9": {
      "type": "text",
      "value": "none",
      "transformations": []
    },
    "67f70d97-a346-42e4-833f-6eaeaeed4fef": {
      "type": "text",
      "value": "10px 10px 10px 0",
      "transformations": []
    },
    "98257461-928e-4ff9-8ac5-0b89298e4ef1": {
      "type": "text",
      "value": "10px 10px 10px 0",
      "transformations": []
    },
    "9931fe6a-074e-4cb7-8355-c18d818679a7": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "72b559e9-2546-4bae-8a61-555567363b11": {
      "type": "text",
      "value": "right",
      "transformations": []
    },
    "30f8c701-7adf-4398-862e-55372e29c14d": {
      "type": "text",
      "value": "50px",
      "transformations": []
    },
    "6635dbb2-b364-4efd-8061-26432007eb1a": {
      "type": "text",
      "value": "right",
      "transformations": []
    },
    "042ccf7d-819b-4fac-8282-2f19069b5386": {
      "type": "text",
      "value": "500px",
      "transformations": []
    },
    "e7bc6e20-1510-4bac-859f-04ec3dcda66b": {
      "type": "text",
      "value": "1.5",
      "transformations": []
    },
    "ef8dc9c6-f333-4b61-8d25-d36afe517520": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "755a70a2-d181-4faf-8593-5ab7601158f9": {
      "type": "text",
      "value": "block",
      "transformations": []
    },
    "9f501c35-54b3-4c60-8fc4-d6a45e776eb3": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "e8acc6b0-d1de-443b-8128-df6b5186f70c": {
      "type": "text",
      "value": "block",
      "transformations": []
    },
    "71764362-e09a-4412-8fbc-ed3cb4d4c954": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "c199b191-88d2-463d-8564-1ce1a1631b2d": {
      "type": "text",
      "value": "block",
      "transformations": []
    },
    "b2117e6b-ace7-4e75-8e7d-323668d1b19d": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "8a53848d-8c7d-44dc-8d13-ae060107c80b": {
      "type": "text",
      "value": "block",
      "transformations": []
    },
    "1906b5b4-6024-48f1-84da-c332e555afb3": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "a565696d-8a60-416e-844a-60c8f2fe8c5a": {
      "type": "text",
      "value": "block",
      "transformations": []
    },
    "15d47b07-396c-4c03-8591-f472598f15e2": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "a8f5c1ce-783b-4626-826a-473ab434c0b2": {
      "type": "text",
      "value": "10px",
      "transformations": []
    },
    "a9cw9a9b-25bb-4e8b-80c0-cf51b8506070": {
      "type": "text",
      "value": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Schonach_-_Paradies_-_Sonnenaufgang.jpg/1280px-Schonach_-_Paradies_-_Sonnenaufgang.jpg",
      "transformations": []
    },
    "d1314274-5efc-4be1-830b-0ff8c92b5029": {
      "type": "text",
      "value": "block",
      "transformations": []
    },
    "9qc84274-5efc-4be1-830b-0ff8c92b5029": {
      "type": "text",
      "value": "",
      "transformations": []
    }
  },
  "join": {
    "p9s3d6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "um5ed6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "wf9ad6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "qww9d6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "s258d6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "qdw7c6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "8a6cd6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "9qc84274-5efc-4be1-830b-0ff8c92b5029"
      }
    }
  },
  "add": {
    "w86fd6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "ew83d6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "wbr7d6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "8d4vd6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "vq8dd6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "7dbvd6d2-00db-8ab5-c332-882575f25426"
      }
    }
  },
  "subtract": {
    "u43wd6d2-00db-8ab5-c332-882575f25426": {
      "value": {
        "ref": "pipe",
        "id": "w3e9d6d2-00db-8ab5-c332-882575f25426"
      }
    }
  },
  "remainder": {
    "34780d22-f521-4c30-89a5-3e7f5b5af7c2": {
      "value": {
        "ref": "pipe",
        "id": "1229d478-bc25-4401-8a89-74fc6cfe8996"
      }
    }
  },
  "vNodeBox": {
    "_rootNode": {
      "title": "app",
      "style": {
        "ref": "style",
        "id": "_rootStyle"
      },
      "parent": {},
      "children": [
        {
          "ref": "vNodeText",
          "id": "2471d6d2-00db-8ab5-c332-882575f25425"
        },
        {
          "ref": "vNodeText",
          "id": "1481d6d2-00db-8ab5-c332-882575f25425"
        },
        {
          "ref": "vNodeText",
          "id": "3481d6d2-00db-8ab5-c332-882575f25425"
        },
        {
          "ref": "vNodeIf",
          "id": "5787c15a-426b-41eb-831d-e3e074159582"
        },
        {
          "ref": "vNodeImage",
          "id": "sd8vc15a-426b-41eb-831d-e3e074159582"
        },
        {
          "ref": "vNodeList",
          "id": "fl89d6d2-00db-8ab5-c332-882575f25425"
        }
      ]
    },
    "gw9dd6d2-00db-8ab5-c332-882575f25426": {
      "title": "box",
      "style": {
        "ref": "style",
        "id": "fq9dd6d2-00db-8ab5-c332-882575f25426"
      },
      "parent": {
        "ref": "vNodeList",
        "id": "fl89d6d2-00db-8ab5-c332-882575f25425"
      },
      "children": []
    }
  },
  "vNodeText": {
    "2471d6d2-00db-8ab5-c332-882575f25425": {
      "title": "Number currently",
      "style": {
        "ref": "style",
        "id": "8481d6d2-00db-8ab5-c332-882575f25426"
      },
      "parent": {
        "ref": "vNodeBox",
        "id": "_rootNode"
      },
      "value": {
        "ref": "pipe",
        "id": "fw8jd6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "1481d6d2-00db-8ab5-c332-882575f25425": {
      "title": "+ button",
      "value": {
        "ref": "pipe",
        "id": "ui8jd6d2-00db-8ab5-c332-882575f25426"
      },
      "style": {
        "ref": "style",
        "id": "9481d6d2-00db-8ab5-c332-882575f25426"
      },
      "parent": {
        "ref": "vNodeBox",
        "id": "_rootNode"
      },
      "click": {
        "ref": "event",
        "id": "d48rd6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "3481d6d2-00db-8ab5-c332-882575f25425": {
      "title": "- button",
      "value": {
        "ref": "pipe",
        "id": "c8wed6d2-00db-8ab5-c332-882575f25426"
      },
      "style": {
        "ref": "style",
        "id": "7481d6d2-00db-8ab5-c332-882575f25426"
      },
      "parent": {
        "ref": "vNodeBox",
        "id": "_rootNode"
      },
      "click": {
        "ref": "event",
        "id": "3a54d6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "e8add1c7-8a01-4164-8604-722d8ab529f1": {
      "title": "is even",
      "style": {
        "ref": "style",
        "id": "4dca73b3-90eb-41e7-8651-2bdcc93f3871"
      },
      "parent": {
        "ref": "vNodeIf",
        "id": "5787c15a-426b-41eb-831d-e3e074159582"
      },
      "value": {
        "ref": "pipe",
        "id": "84369aba-4a4d-4932-8a9a-8f9ca948b6a2"
      }
    }
  },
  "vNodeInput": {},
  "vNodeList": {
    "fl89d6d2-00db-8ab5-c332-882575f25425": {
      "title": "list of boxes",
      "value": {
        "ref": "pipe",
        "id": "f9qxd6d2-00db-8ab5-c332-882575f25426"
      },
      "parent": {
        "ref": "vNodeBox",
        "id": "_rootNode"
      },
      "children": [
        {
          "ref": "vNodeBox",
          "id": "gw9dd6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    }
  },
  "vNodeIf": {
    "5787c15a-426b-41eb-831d-e3e074159582": {
      "title": "is number even",
      "value": {
        "ref": "pipe",
        "id": "c2fb9a9b-25bb-4e8b-80c0-cf51b8506070"
      },
      "parent": {
        "ref": "vNodeBox",
        "id": "_rootNode"
      },
      "children": [
        {
          "ref": "vNodeText",
          "id": "e8add1c7-8a01-4164-8604-722d8ab529f1"
        }
      ]
    }
  },
  "vNodeImage": {
    "sd8vc15a-426b-41eb-831d-e3e074159582": {
      "title": "hills",
      "src": {
        "ref": "pipe",
        "id": "a9cw9a9b-25bb-4e8b-80c0-cf51b8506070"
      },
      "parent": {
        "ref": "vNodeBox",
        "id": "_rootNode"
      },
      "style": {
        "ref": "style",
        "id": "wf8d73b3-90eb-41e7-8651-2bdcc93f3871"
      }
    }
  },
  "style": {
    "_rootStyle": {
      "fontFamily": {
        "ref": "pipe",
        "id": "945f0818-7743-4edd-8c76-3dd5a8ba7fa9"
      },
      "background": {
        "ref": "pipe",
        "id": "a60899ee-9925-4e05-890e-b9428b02dbf9"
      },
      "minHeight": {
        "ref": "pipe",
        "id": "1e465403-5382-4a45-89da-8d88e2eb2fb9"
      }
    },
    "8481d6d2-00db-8ab5-c332-882575f25426": {
      "padding": {
        "ref": "pipe",
        "id": "ef2ec184-199f-4ee8-8e30-b99dbc1df5db"
      },
      "margin": {
        "ref": "pipe",
        "id": "fab286c4-ded3-4a5e-8749-7678abcbb125"
      }
    },
    "9481d6d2-00db-8ab5-c332-882575f25426": {
      "padding": {
        "ref": "pipe",
        "id": "703f8e02-c5c3-4d27-8ca2-722c4d0d1ea0"
      },
      "background": {
        "ref": "pipe",
        "id": "8f3c6630-d8d9-4bc1-8a3d-ba4dad3091f0"
      },
      "display": {
        "ref": "pipe",
        "id": "d31c4746-2329-4404-8689-fbf2393efd44"
      },
      "borderRadius": {
        "ref": "pipe",
        "id": "d5754fdb-4689-4f87-87fc-51d60022b32c"
      },
      "cursor": {
        "ref": "pipe",
        "id": "0bc6a18c-1766-42bd-8b4a-202a2b0c34fe"
      },
      "userSelect": {
        "ref": "pipe",
        "id": "9b250ef8-c1be-4706-8a71-f444f18f0f82"
      },
      "margin": {
        "ref": "pipe",
        "id": "b0a10497-ec26-4ff7-8739-a193755cbcae"
      }
    },
    "7481d6d2-00db-8ab5-c332-882575f25426": {
      "padding": {
        "ref": "pipe",
        "id": "8764e258-599d-4252-8112-d06fcd0d5e2a"
      },
      "background": {
        "ref": "pipe",
        "id": "8caaf876-10bc-47de-89d9-869c892cd4ce"
      },
      "display": {
        "ref": "pipe",
        "id": "ae987bba-734a-46ae-8c82-c04896221179"
      },
      "borderRadius": {
        "ref": "pipe",
        "id": "b7c791a6-2c91-4b62-8820-dbaaf9d5c179"
      },
      "cursor": {
        "ref": "pipe",
        "id": "d795a510-ccf9-4d92-81ee-5e512b81ee58"
      },
      "margin": {
        "ref": "pipe",
        "id": "7518524a-0bc2-465c-814e-0a5d39de25e3"
      }
    },
    "8092ac5e-dfd0-4492-a65d-8ac3eec325e0": {
      "padding": {
        "ref": "pipe",
        "id": "67f70d97-a346-42e4-833f-6eaeaeed4fef"
      }
    },
    "a9461e28-7d92-49a0-9001-23d74e4b382d": {
      "padding": {
        "ref": "pipe",
        "id": "98257461-928e-4ff9-8ac5-0b89298e4ef1"
      }
    },
    "766b11ec-da27-494c-b272-c26fec3f6475": {
      "padding": {
        "ref": "pipe",
        "id": "9931fe6a-074e-4cb7-8355-c18d818679a7"
      },
      "float": {
        "ref": "pipe",
        "id": "72b559e9-2546-4bae-8a61-555567363b11"
      },
      "textAlign": {
        "ref": "pipe",
        "id": "6635dbb2-b364-4efd-8061-26432007eb1a"
      },
      "maxWidth": {
        "ref": "pipe",
        "id": "042ccf7d-819b-4fac-8282-2f19069b5386"
      }
    },
    "cbcd8edb-4aa2-43fe-ad39-cee79b490295": {
      "padding": {
        "ref": "pipe",
        "id": "ef8dc9c6-f333-4b61-8d25-d36afe517520"
      },
      "display": {
        "ref": "pipe",
        "id": "755a70a2-d181-4faf-8593-5ab7601158f9"
      }
    },
    "6763f102-23f7-4390-b463-4e1b14e866c9": {
      "padding": {
        "ref": "pipe",
        "id": "9f501c35-54b3-4c60-8fc4-d6a45e776eb3"
      },
      "display": {
        "ref": "pipe",
        "id": "e8acc6b0-d1de-443b-8128-df6b5186f70c"
      }
    },
    "91c9adf0-d62e-4580-93e7-f39594ae5e7d": {
      "padding": {
        "ref": "pipe",
        "id": "71764362-e09a-4412-8fbc-ed3cb4d4c954"
      },
      "display": {
        "ref": "pipe",
        "id": "c199b191-88d2-463d-8564-1ce1a1631b2d"
      }
    },
    "e9fbeb39-7193-4522-91b3-761bd35639d3": {
      "padding": {
        "ref": "pipe",
        "id": "b2117e6b-ace7-4e75-8e7d-323668d1b19d"
      },
      "display": {
        "ref": "pipe",
        "id": "8a53848d-8c7d-44dc-8d13-ae060107c80b"
      }
    },
    "3cf5d89d-3703-483e-ab64-5a5b780aec27": {
      "padding": {
        "ref": "pipe",
        "id": "1906b5b4-6024-48f1-84da-c332e555afb3"
      },
      "display": {
        "ref": "pipe",
        "id": "a565696d-8a60-416e-844a-60c8f2fe8c5a"
      }
    },
    "fq9dd6d2-00db-8ab5-c332-882575f25426": {
      "padding": {
        "ref": "pipe",
        "id": "15d47b07-396c-4c03-8591-f472598f15e2"
      },
      "width": {
        "ref": "pipe",
        "id": "3qkid6d2-00db-8ab5-c332-882575f25426"
      },
      "height": {
        "ref": "pipe",
        "id": "t7vqd6d2-00db-8ab5-c332-882575f25426"
      },
      "background": {
        "ref": "pipe",
        "id": "8cq6b6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "4dca73b3-90eb-41e7-8651-2bdcc93f3871": {
      "padding": {
        "ref": "pipe",
        "id": "a8f5c1ce-783b-4626-826a-473ab434c0b2"
      }
    },
    "wf8d73b3-90eb-41e7-8651-2bdcc93f3871": {
      "display": {
        "ref": "pipe",
        "id": "d1314274-5efc-4be1-830b-0ff8c92b5029"
      }
    }
  },
  "nameSpace": {
    "_rootNameSpace": {
      "title": "state",
      "children": [
        {
          "ref": "state",
          "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
        },
        {
          "ref": "state",
          "id": "c8q9d6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    }
  },
  "state": {
    "46vdd6d2-00db-8ab5-c332-882575f25426": {
      "title": "number",
      "ref": "46vdd6d2-00db-8ab5-c332-882575f25426",
      "type": "number",
      "defaultValue": 0,
      "mutators": [
        {
          "ref": "mutator",
          "id": "as55d6d2-00db-8ab5-c332-882575f25426"
        },
        {
          "ref": "mutator",
          "id": "9dq8d6d2-00db-8ab5-c332-882575f25426"
        }
      ]
    },
    "c8q9d6d2-00db-8ab5-c332-882575f25426": {
      "title": "tiles",
      "ref": "c8q9d6d2-00db-8ab5-c332-882575f25426",
      "type": "table",
      "definition": {
        "x": "number",
        "y": "number",
        "color": "text"
      },
      "defaultValue": {
        "ops6d6d2-00db-8ab5-c332-882575f25426": {
          "x": 120,
          "y": 100,
          "color": "#eab65c"
        },
        "wpv5d6d2-00db-8ab5-c332-882575f25426": {
          "x": 200,
          "y": 120,
          "color": "#53B2ED"
        },
        "qn27d6d2-00db-8ab5-c332-882575f25426": {
          "x": 130,
          "y": 200,
          "color": "#5bcc5b"
        },
        "ca9rd6d2-00db-8ab5-c332-882575f25426": {
          "x": 150,
          "y": 150,
          "color": "#4d4d4d"
        }
      },
      "mutators": []
    }
  },
  "mutator": {
    "as55d6d2-00db-8ab5-c332-882575f25426": {
      "event": {
        "ref": "event",
        "id": "d48rd6d2-00db-8ab5-c332-882575f25426"
      },
      "state": {
        "ref": "state",
        "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
      },
      "mutation": {
        "ref": "pipe",
        "id": "pdq6d6d2-00db-8ab5-c332-882575f25426"
      }
    },
    "9dq8d6d2-00db-8ab5-c332-882575f25426": {
      "event": {
        "ref": "event",
        "id": "3a54d6d2-00db-8ab5-c332-882575f25426"
      },
      "state": {
        "ref": "state",
        "id": "46vdd6d2-00db-8ab5-c332-882575f25426"
      },
      "mutation": {
        "ref": "pipe",
        "id": "452qd6d2-00db-8ab5-c332-882575f25426"
      }
    }
  },
  "event": {
    "d48rd6d2-00db-8ab5-c332-882575f25426": {
      "type": "click",
      "mutators": [
        {
          "ref": "mutator",
          "id": "as55d6d2-00db-8ab5-c332-882575f25426"
        }
      ],
      "emitter": {
        "ref": "vNodeText",
        "id": "1481d6d2-00db-8ab5-c332-882575f25425"
      },
      "data": []
    },
    "3a54d6d2-00db-8ab5-c332-882575f25426": {
      "type": "click",
      "mutators": [
        {
          "ref": "mutator",
          "id": "9dq8d6d2-00db-8ab5-c332-882575f25426"
        }
      ],
      "emitter": {
        "ref": "vNodeText",
        "id": "3481d6d2-00db-8ab5-c332-882575f25425"
      },
      "data": []
    }
  }
}
},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmlnLmpzL2JpZy5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0Y2xpY2svbGliL2Zhc3RjbGljay5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9oLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL2h0bWxkb21hcGkuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vaXMuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9hdHRyaWJ1dGVzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvY2xhc3MuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vbW9kdWxlcy9ldmVudGxpc3RlbmVycy5qcyIsIm5vZGVfbW9kdWxlcy9zbmFiYmRvbS9tb2R1bGVzL3Byb3BzLmpzIiwibm9kZV9tb2R1bGVzL3NuYWJiZG9tL21vZHVsZXMvc3R5bGUuanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vc25hYmJkb20uanMiLCJub2RlX21vZHVsZXMvc25hYmJkb20vdm5vZGUuanMiLCJzcmNcXGluZGV4LmpzIiwic3JjXFx1Z25pcy5qcyIsInVnbmlzX2NvbXBvbmVudHMvYXBwLmpzb24iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdG5DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3owQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBiaWcuanMgdjMuMS4zIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWtlTWNsL2JpZy5qcy9MSUNFTkNFICovXHJcbjsoZnVuY3Rpb24gKGdsb2JhbCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuLypcclxuICBiaWcuanMgdjMuMS4zXHJcbiAgQSBzbWFsbCwgZmFzdCwgZWFzeS10by11c2UgbGlicmFyeSBmb3IgYXJiaXRyYXJ5LXByZWNpc2lvbiBkZWNpbWFsIGFyaXRobWV0aWMuXHJcbiAgaHR0cHM6Ly9naXRodWIuY29tL01pa2VNY2wvYmlnLmpzL1xyXG4gIENvcHlyaWdodCAoYykgMjAxNCBNaWNoYWVsIE1jbGF1Z2hsaW4gPE04Y2g4OGxAZ21haWwuY29tPlxyXG4gIE1JVCBFeHBhdCBMaWNlbmNlXHJcbiovXHJcblxyXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogRURJVEFCTEUgREVGQVVMVFMgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG5cclxuICAgIC8vIFRoZSBkZWZhdWx0IHZhbHVlcyBiZWxvdyBtdXN0IGJlIGludGVnZXJzIHdpdGhpbiB0aGUgc3RhdGVkIHJhbmdlcy5cclxuXHJcbiAgICAvKlxyXG4gICAgICogVGhlIG1heGltdW0gbnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzIG9mIHRoZSByZXN1bHRzIG9mIG9wZXJhdGlvbnNcclxuICAgICAqIGludm9sdmluZyBkaXZpc2lvbjogZGl2IGFuZCBzcXJ0LCBhbmQgcG93IHdpdGggbmVnYXRpdmUgZXhwb25lbnRzLlxyXG4gICAgICovXHJcbiAgICB2YXIgRFAgPSAyMCwgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAwIHRvIE1BWF9EUFxyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAqIFRoZSByb3VuZGluZyBtb2RlIHVzZWQgd2hlbiByb3VuZGluZyB0byB0aGUgYWJvdmUgZGVjaW1hbCBwbGFjZXMuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiAwIFRvd2FyZHMgemVybyAoaS5lLiB0cnVuY2F0ZSwgbm8gcm91bmRpbmcpLiAgICAgICAoUk9VTkRfRE9XTilcclxuICAgICAgICAgKiAxIFRvIG5lYXJlc3QgbmVpZ2hib3VyLiBJZiBlcXVpZGlzdGFudCwgcm91bmQgdXAuICAoUk9VTkRfSEFMRl9VUClcclxuICAgICAgICAgKiAyIFRvIG5lYXJlc3QgbmVpZ2hib3VyLiBJZiBlcXVpZGlzdGFudCwgdG8gZXZlbi4gICAoUk9VTkRfSEFMRl9FVkVOKVxyXG4gICAgICAgICAqIDMgQXdheSBmcm9tIHplcm8uICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChST1VORF9VUClcclxuICAgICAgICAgKi9cclxuICAgICAgICBSTSA9IDEsICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDAsIDEsIDIgb3IgM1xyXG5cclxuICAgICAgICAvLyBUaGUgbWF4aW11bSB2YWx1ZSBvZiBEUCBhbmQgQmlnLkRQLlxyXG4gICAgICAgIE1BWF9EUCA9IDFFNiwgICAgICAgICAgICAgICAgICAgICAgLy8gMCB0byAxMDAwMDAwXHJcblxyXG4gICAgICAgIC8vIFRoZSBtYXhpbXVtIG1hZ25pdHVkZSBvZiB0aGUgZXhwb25lbnQgYXJndW1lbnQgdG8gdGhlIHBvdyBtZXRob2QuXHJcbiAgICAgICAgTUFYX1BPV0VSID0gMUU2LCAgICAgICAgICAgICAgICAgICAvLyAxIHRvIDEwMDAwMDBcclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgKiBUaGUgZXhwb25lbnQgdmFsdWUgYXQgYW5kIGJlbmVhdGggd2hpY2ggdG9TdHJpbmcgcmV0dXJucyBleHBvbmVudGlhbFxyXG4gICAgICAgICAqIG5vdGF0aW9uLlxyXG4gICAgICAgICAqIEphdmFTY3JpcHQncyBOdW1iZXIgdHlwZTogLTdcclxuICAgICAgICAgKiAtMTAwMDAwMCBpcyB0aGUgbWluaW11bSByZWNvbW1lbmRlZCBleHBvbmVudCB2YWx1ZSBvZiBhIEJpZy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBFX05FRyA9IC03LCAgICAgICAgICAgICAgICAgICAvLyAwIHRvIC0xMDAwMDAwXHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICogVGhlIGV4cG9uZW50IHZhbHVlIGF0IGFuZCBhYm92ZSB3aGljaCB0b1N0cmluZyByZXR1cm5zIGV4cG9uZW50aWFsXHJcbiAgICAgICAgICogbm90YXRpb24uXHJcbiAgICAgICAgICogSmF2YVNjcmlwdCdzIE51bWJlciB0eXBlOiAyMVxyXG4gICAgICAgICAqIDEwMDAwMDAgaXMgdGhlIG1heGltdW0gcmVjb21tZW5kZWQgZXhwb25lbnQgdmFsdWUgb2YgYSBCaWcuXHJcbiAgICAgICAgICogKFRoaXMgbGltaXQgaXMgbm90IGVuZm9yY2VkIG9yIGNoZWNrZWQuKVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVfUE9TID0gMjEsICAgICAgICAgICAgICAgICAgIC8vIDAgdG8gMTAwMDAwMFxyXG5cclxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuXHJcbiAgICAgICAgLy8gVGhlIHNoYXJlZCBwcm90b3R5cGUgb2JqZWN0LlxyXG4gICAgICAgIFAgPSB7fSxcclxuICAgICAgICBpc1ZhbGlkID0gL14tPyhcXGQrKFxcLlxcZCopP3xcXC5cXGQrKShlWystXT9cXGQrKT8kL2ksXHJcbiAgICAgICAgQmlnO1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogQ3JlYXRlIGFuZCByZXR1cm4gYSBCaWcgY29uc3RydWN0b3IuXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBiaWdGYWN0b3J5KCkge1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAqIFRoZSBCaWcgY29uc3RydWN0b3IgYW5kIGV4cG9ydGVkIGZ1bmN0aW9uLlxyXG4gICAgICAgICAqIENyZWF0ZSBhbmQgcmV0dXJuIGEgbmV3IGluc3RhbmNlIG9mIGEgQmlnIG51bWJlciBvYmplY3QuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBuIHtudW1iZXJ8c3RyaW5nfEJpZ30gQSBudW1lcmljIHZhbHVlLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIEJpZyhuKSB7XHJcbiAgICAgICAgICAgIHZhciB4ID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgIC8vIEVuYWJsZSBjb25zdHJ1Y3RvciB1c2FnZSB3aXRob3V0IG5ldy5cclxuICAgICAgICAgICAgaWYgKCEoeCBpbnN0YW5jZW9mIEJpZykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuID09PSB2b2lkIDAgPyBiaWdGYWN0b3J5KCkgOiBuZXcgQmlnKG4pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBEdXBsaWNhdGUuXHJcbiAgICAgICAgICAgIGlmIChuIGluc3RhbmNlb2YgQmlnKSB7XHJcbiAgICAgICAgICAgICAgICB4LnMgPSBuLnM7XHJcbiAgICAgICAgICAgICAgICB4LmUgPSBuLmU7XHJcbiAgICAgICAgICAgICAgICB4LmMgPSBuLmMuc2xpY2UoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHBhcnNlKHgsIG4pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvKlxyXG4gICAgICAgICAgICAgKiBSZXRhaW4gYSByZWZlcmVuY2UgdG8gdGhpcyBCaWcgY29uc3RydWN0b3IsIGFuZCBzaGFkb3dcclxuICAgICAgICAgICAgICogQmlnLnByb3RvdHlwZS5jb25zdHJ1Y3RvciB3aGljaCBwb2ludHMgdG8gT2JqZWN0LlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgeC5jb25zdHJ1Y3RvciA9IEJpZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEJpZy5wcm90b3R5cGUgPSBQO1xyXG4gICAgICAgIEJpZy5EUCA9IERQO1xyXG4gICAgICAgIEJpZy5STSA9IFJNO1xyXG4gICAgICAgIEJpZy5FX05FRyA9IEVfTkVHO1xyXG4gICAgICAgIEJpZy5FX1BPUyA9IEVfUE9TO1xyXG5cclxuICAgICAgICByZXR1cm4gQmlnO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBQcml2YXRlIGZ1bmN0aW9uc1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgQmlnIHggaW4gbm9ybWFsIG9yIGV4cG9uZW50aWFsXHJcbiAgICAgKiBub3RhdGlvbiB0byBkcCBmaXhlZCBkZWNpbWFsIHBsYWNlcyBvciBzaWduaWZpY2FudCBkaWdpdHMuXHJcbiAgICAgKlxyXG4gICAgICogeCB7QmlnfSBUaGUgQmlnIHRvIGZvcm1hdC5cclxuICAgICAqIGRwIHtudW1iZXJ9IEludGVnZXIsIDAgdG8gTUFYX0RQIGluY2x1c2l2ZS5cclxuICAgICAqIHRvRSB7bnVtYmVyfSAxICh0b0V4cG9uZW50aWFsKSwgMiAodG9QcmVjaXNpb24pIG9yIHVuZGVmaW5lZCAodG9GaXhlZCkuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGZvcm1hdCh4LCBkcCwgdG9FKSB7XHJcbiAgICAgICAgdmFyIEJpZyA9IHguY29uc3RydWN0b3IsXHJcblxyXG4gICAgICAgICAgICAvLyBUaGUgaW5kZXggKG5vcm1hbCBub3RhdGlvbikgb2YgdGhlIGRpZ2l0IHRoYXQgbWF5IGJlIHJvdW5kZWQgdXAuXHJcbiAgICAgICAgICAgIGkgPSBkcCAtICh4ID0gbmV3IEJpZyh4KSkuZSxcclxuICAgICAgICAgICAgYyA9IHguYztcclxuXHJcbiAgICAgICAgLy8gUm91bmQ/XHJcbiAgICAgICAgaWYgKGMubGVuZ3RoID4gKytkcCkge1xyXG4gICAgICAgICAgICBybmQoeCwgaSwgQmlnLlJNKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghY1swXSkge1xyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0b0UpIHtcclxuICAgICAgICAgICAgaSA9IGRwO1xyXG5cclxuICAgICAgICAvLyB0b0ZpeGVkXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgYyA9IHguYztcclxuXHJcbiAgICAgICAgICAgIC8vIFJlY2FsY3VsYXRlIGkgYXMgeC5lIG1heSBoYXZlIGNoYW5nZWQgaWYgdmFsdWUgcm91bmRlZCB1cC5cclxuICAgICAgICAgICAgaSA9IHguZSArIGkgKyAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQXBwZW5kIHplcm9zP1xyXG4gICAgICAgIGZvciAoOyBjLmxlbmd0aCA8IGk7IGMucHVzaCgwKSkge1xyXG4gICAgICAgIH1cclxuICAgICAgICBpID0geC5lO1xyXG5cclxuICAgICAgICAvKlxyXG4gICAgICAgICAqIHRvUHJlY2lzaW9uIHJldHVybnMgZXhwb25lbnRpYWwgbm90YXRpb24gaWYgdGhlIG51bWJlciBvZlxyXG4gICAgICAgICAqIHNpZ25pZmljYW50IGRpZ2l0cyBzcGVjaWZpZWQgaXMgbGVzcyB0aGFuIHRoZSBudW1iZXIgb2YgZGlnaXRzXHJcbiAgICAgICAgICogbmVjZXNzYXJ5IHRvIHJlcHJlc2VudCB0aGUgaW50ZWdlciBwYXJ0IG9mIHRoZSB2YWx1ZSBpbiBub3JtYWxcclxuICAgICAgICAgKiBub3RhdGlvbi5cclxuICAgICAgICAgKi9cclxuICAgICAgICByZXR1cm4gdG9FID09PSAxIHx8IHRvRSAmJiAoZHAgPD0gaSB8fCBpIDw9IEJpZy5FX05FRykgP1xyXG5cclxuICAgICAgICAgIC8vIEV4cG9uZW50aWFsIG5vdGF0aW9uLlxyXG4gICAgICAgICAgKHgucyA8IDAgJiYgY1swXSA/ICctJyA6ICcnKSArXHJcbiAgICAgICAgICAgIChjLmxlbmd0aCA+IDEgPyBjWzBdICsgJy4nICsgYy5qb2luKCcnKS5zbGljZSgxKSA6IGNbMF0pICtcclxuICAgICAgICAgICAgICAoaSA8IDAgPyAnZScgOiAnZSsnKSArIGlcclxuXHJcbiAgICAgICAgICAvLyBOb3JtYWwgbm90YXRpb24uXHJcbiAgICAgICAgICA6IHgudG9TdHJpbmcoKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLypcclxuICAgICAqIFBhcnNlIHRoZSBudW1iZXIgb3Igc3RyaW5nIHZhbHVlIHBhc3NlZCB0byBhIEJpZyBjb25zdHJ1Y3Rvci5cclxuICAgICAqXHJcbiAgICAgKiB4IHtCaWd9IEEgQmlnIG51bWJlciBpbnN0YW5jZS5cclxuICAgICAqIG4ge251bWJlcnxzdHJpbmd9IEEgbnVtZXJpYyB2YWx1ZS5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gcGFyc2UoeCwgbikge1xyXG4gICAgICAgIHZhciBlLCBpLCBuTDtcclxuXHJcbiAgICAgICAgLy8gTWludXMgemVybz9cclxuICAgICAgICBpZiAobiA9PT0gMCAmJiAxIC8gbiA8IDApIHtcclxuICAgICAgICAgICAgbiA9ICctMCc7XHJcblxyXG4gICAgICAgIC8vIEVuc3VyZSBuIGlzIHN0cmluZyBhbmQgY2hlY2sgdmFsaWRpdHkuXHJcbiAgICAgICAgfSBlbHNlIGlmICghaXNWYWxpZC50ZXN0KG4gKz0gJycpKSB7XHJcbiAgICAgICAgICAgIHRocm93RXJyKE5hTik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBEZXRlcm1pbmUgc2lnbi5cclxuICAgICAgICB4LnMgPSBuLmNoYXJBdCgwKSA9PSAnLScgPyAobiA9IG4uc2xpY2UoMSksIC0xKSA6IDE7XHJcblxyXG4gICAgICAgIC8vIERlY2ltYWwgcG9pbnQ/XHJcbiAgICAgICAgaWYgKChlID0gbi5pbmRleE9mKCcuJykpID4gLTEpIHtcclxuICAgICAgICAgICAgbiA9IG4ucmVwbGFjZSgnLicsICcnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4cG9uZW50aWFsIGZvcm0/XHJcbiAgICAgICAgaWYgKChpID0gbi5zZWFyY2goL2UvaSkpID4gMCkge1xyXG5cclxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGV4cG9uZW50LlxyXG4gICAgICAgICAgICBpZiAoZSA8IDApIHtcclxuICAgICAgICAgICAgICAgIGUgPSBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGUgKz0gK24uc2xpY2UoaSArIDEpO1xyXG4gICAgICAgICAgICBuID0gbi5zdWJzdHJpbmcoMCwgaSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoZSA8IDApIHtcclxuXHJcbiAgICAgICAgICAgIC8vIEludGVnZXIuXHJcbiAgICAgICAgICAgIGUgPSBuLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIERldGVybWluZSBsZWFkaW5nIHplcm9zLlxyXG4gICAgICAgIGZvciAoaSA9IDA7IG4uY2hhckF0KGkpID09ICcwJzsgaSsrKSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaSA9PSAobkwgPSBuLmxlbmd0aCkpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIFplcm8uXHJcbiAgICAgICAgICAgIHguYyA9IFsgeC5lID0gMCBdO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgdHJhaWxpbmcgemVyb3MuXHJcbiAgICAgICAgICAgIGZvciAoOyBuLmNoYXJBdCgtLW5MKSA9PSAnMCc7KSB7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHguZSA9IGUgLSBpIC0gMTtcclxuICAgICAgICAgICAgeC5jID0gW107XHJcblxyXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHN0cmluZyB0byBhcnJheSBvZiBkaWdpdHMgd2l0aG91dCBsZWFkaW5nL3RyYWlsaW5nIHplcm9zLlxyXG4gICAgICAgICAgICBmb3IgKGUgPSAwOyBpIDw9IG5MOyB4LmNbZSsrXSA9ICtuLmNoYXJBdChpKyspKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB4O1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUm91bmQgQmlnIHggdG8gYSBtYXhpbXVtIG9mIGRwIGRlY2ltYWwgcGxhY2VzIHVzaW5nIHJvdW5kaW5nIG1vZGUgcm0uXHJcbiAgICAgKiBDYWxsZWQgYnkgZGl2LCBzcXJ0IGFuZCByb3VuZC5cclxuICAgICAqXHJcbiAgICAgKiB4IHtCaWd9IFRoZSBCaWcgdG8gcm91bmQuXHJcbiAgICAgKiBkcCB7bnVtYmVyfSBJbnRlZ2VyLCAwIHRvIE1BWF9EUCBpbmNsdXNpdmUuXHJcbiAgICAgKiBybSB7bnVtYmVyfSAwLCAxLCAyIG9yIDMgKERPV04sIEhBTEZfVVAsIEhBTEZfRVZFTiwgVVApXHJcbiAgICAgKiBbbW9yZV0ge2Jvb2xlYW59IFdoZXRoZXIgdGhlIHJlc3VsdCBvZiBkaXZpc2lvbiB3YXMgdHJ1bmNhdGVkLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBybmQoeCwgZHAsIHJtLCBtb3JlKSB7XHJcbiAgICAgICAgdmFyIHUsXHJcbiAgICAgICAgICAgIHhjID0geC5jLFxyXG4gICAgICAgICAgICBpID0geC5lICsgZHAgKyAxO1xyXG5cclxuICAgICAgICBpZiAocm0gPT09IDEpIHtcclxuXHJcbiAgICAgICAgICAgIC8vIHhjW2ldIGlzIHRoZSBkaWdpdCBhZnRlciB0aGUgZGlnaXQgdGhhdCBtYXkgYmUgcm91bmRlZCB1cC5cclxuICAgICAgICAgICAgbW9yZSA9IHhjW2ldID49IDU7XHJcbiAgICAgICAgfSBlbHNlIGlmIChybSA9PT0gMikge1xyXG4gICAgICAgICAgICBtb3JlID0geGNbaV0gPiA1IHx8IHhjW2ldID09IDUgJiZcclxuICAgICAgICAgICAgICAobW9yZSB8fCBpIDwgMCB8fCB4Y1tpICsgMV0gIT09IHUgfHwgeGNbaSAtIDFdICYgMSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChybSA9PT0gMykge1xyXG4gICAgICAgICAgICBtb3JlID0gbW9yZSB8fCB4Y1tpXSAhPT0gdSB8fCBpIDwgMDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBtb3JlID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBpZiAocm0gIT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRocm93RXJyKCchQmlnLlJNIScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaSA8IDEgfHwgIXhjWzBdKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAobW9yZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIDEsIDAuMSwgMC4wMSwgMC4wMDEsIDAuMDAwMSBldGMuXHJcbiAgICAgICAgICAgICAgICB4LmUgPSAtZHA7XHJcbiAgICAgICAgICAgICAgICB4LmMgPSBbMV07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gWmVyby5cclxuICAgICAgICAgICAgICAgIHguYyA9IFt4LmUgPSAwXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW55IGRpZ2l0cyBhZnRlciB0aGUgcmVxdWlyZWQgZGVjaW1hbCBwbGFjZXMuXHJcbiAgICAgICAgICAgIHhjLmxlbmd0aCA9IGktLTtcclxuXHJcbiAgICAgICAgICAgIC8vIFJvdW5kIHVwP1xyXG4gICAgICAgICAgICBpZiAobW9yZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJvdW5kaW5nIHVwIG1heSBtZWFuIHRoZSBwcmV2aW91cyBkaWdpdCBoYXMgdG8gYmUgcm91bmRlZCB1cC5cclxuICAgICAgICAgICAgICAgIGZvciAoOyArK3hjW2ldID4gOTspIHtcclxuICAgICAgICAgICAgICAgICAgICB4Y1tpXSA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghaS0tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICsreC5lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4Yy51bnNoaWZ0KDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRyYWlsaW5nIHplcm9zLlxyXG4gICAgICAgICAgICBmb3IgKGkgPSB4Yy5sZW5ndGg7ICF4Y1stLWldOyB4Yy5wb3AoKSkge1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geDtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLypcclxuICAgICAqIFRocm93IGEgQmlnRXJyb3IuXHJcbiAgICAgKlxyXG4gICAgICogbWVzc2FnZSB7c3RyaW5nfSBUaGUgZXJyb3IgbWVzc2FnZS5cclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gdGhyb3dFcnIobWVzc2FnZSkge1xyXG4gICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcbiAgICAgICAgZXJyLm5hbWUgPSAnQmlnRXJyb3InO1xyXG5cclxuICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIFByb3RvdHlwZS9pbnN0YW5jZSBtZXRob2RzXHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBSZXR1cm4gYSBuZXcgQmlnIHdob3NlIHZhbHVlIGlzIHRoZSBhYnNvbHV0ZSB2YWx1ZSBvZiB0aGlzIEJpZy5cclxuICAgICAqL1xyXG4gICAgUC5hYnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHggPSBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzKTtcclxuICAgICAgICB4LnMgPSAxO1xyXG5cclxuICAgICAgICByZXR1cm4geDtcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBSZXR1cm5cclxuICAgICAqIDEgaWYgdGhlIHZhbHVlIG9mIHRoaXMgQmlnIGlzIGdyZWF0ZXIgdGhhbiB0aGUgdmFsdWUgb2YgQmlnIHksXHJcbiAgICAgKiAtMSBpZiB0aGUgdmFsdWUgb2YgdGhpcyBCaWcgaXMgbGVzcyB0aGFuIHRoZSB2YWx1ZSBvZiBCaWcgeSwgb3JcclxuICAgICAqIDAgaWYgdGhleSBoYXZlIHRoZSBzYW1lIHZhbHVlLlxyXG4gICAgKi9cclxuICAgIFAuY21wID0gZnVuY3Rpb24gKHkpIHtcclxuICAgICAgICB2YXIgeE5lZyxcclxuICAgICAgICAgICAgeCA9IHRoaXMsXHJcbiAgICAgICAgICAgIHhjID0geC5jLFxyXG4gICAgICAgICAgICB5YyA9ICh5ID0gbmV3IHguY29uc3RydWN0b3IoeSkpLmMsXHJcbiAgICAgICAgICAgIGkgPSB4LnMsXHJcbiAgICAgICAgICAgIGogPSB5LnMsXHJcbiAgICAgICAgICAgIGsgPSB4LmUsXHJcbiAgICAgICAgICAgIGwgPSB5LmU7XHJcblxyXG4gICAgICAgIC8vIEVpdGhlciB6ZXJvP1xyXG4gICAgICAgIGlmICgheGNbMF0gfHwgIXljWzBdKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAheGNbMF0gPyAheWNbMF0gPyAwIDogLWogOiBpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gU2lnbnMgZGlmZmVyP1xyXG4gICAgICAgIGlmIChpICE9IGopIHtcclxuICAgICAgICAgICAgcmV0dXJuIGk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHhOZWcgPSBpIDwgMDtcclxuXHJcbiAgICAgICAgLy8gQ29tcGFyZSBleHBvbmVudHMuXHJcbiAgICAgICAgaWYgKGsgIT0gbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gayA+IGwgXiB4TmVnID8gMSA6IC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaSA9IC0xO1xyXG4gICAgICAgIGogPSAoayA9IHhjLmxlbmd0aCkgPCAobCA9IHljLmxlbmd0aCkgPyBrIDogbDtcclxuXHJcbiAgICAgICAgLy8gQ29tcGFyZSBkaWdpdCBieSBkaWdpdC5cclxuICAgICAgICBmb3IgKDsgKytpIDwgajspIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh4Y1tpXSAhPSB5Y1tpXSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHhjW2ldID4geWNbaV0gXiB4TmVnID8gMSA6IC0xO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDb21wYXJlIGxlbmd0aHMuXHJcbiAgICAgICAgcmV0dXJuIGsgPT0gbCA/IDAgOiBrID4gbCBeIHhOZWcgPyAxIDogLTE7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgbmV3IEJpZyB3aG9zZSB2YWx1ZSBpcyB0aGUgdmFsdWUgb2YgdGhpcyBCaWcgZGl2aWRlZCBieSB0aGVcclxuICAgICAqIHZhbHVlIG9mIEJpZyB5LCByb3VuZGVkLCBpZiBuZWNlc3NhcnksIHRvIGEgbWF4aW11bSBvZiBCaWcuRFAgZGVjaW1hbFxyXG4gICAgICogcGxhY2VzIHVzaW5nIHJvdW5kaW5nIG1vZGUgQmlnLlJNLlxyXG4gICAgICovXHJcbiAgICBQLmRpdiA9IGZ1bmN0aW9uICh5KSB7XHJcbiAgICAgICAgdmFyIHggPSB0aGlzLFxyXG4gICAgICAgICAgICBCaWcgPSB4LmNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICAvLyBkaXZpZGVuZFxyXG4gICAgICAgICAgICBkdmQgPSB4LmMsXHJcbiAgICAgICAgICAgIC8vZGl2aXNvclxyXG4gICAgICAgICAgICBkdnMgPSAoeSA9IG5ldyBCaWcoeSkpLmMsXHJcbiAgICAgICAgICAgIHMgPSB4LnMgPT0geS5zID8gMSA6IC0xLFxyXG4gICAgICAgICAgICBkcCA9IEJpZy5EUDtcclxuXHJcbiAgICAgICAgaWYgKGRwICE9PSB+fmRwIHx8IGRwIDwgMCB8fCBkcCA+IE1BWF9EUCkge1xyXG4gICAgICAgICAgICB0aHJvd0VycignIUJpZy5EUCEnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEVpdGhlciAwP1xyXG4gICAgICAgIGlmICghZHZkWzBdIHx8ICFkdnNbMF0pIHtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIGJvdGggYXJlIDAsIHRocm93IE5hTlxyXG4gICAgICAgICAgICBpZiAoZHZkWzBdID09IGR2c1swXSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3dFcnIoTmFOKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gSWYgZHZzIGlzIDAsIHRocm93ICstSW5maW5pdHkuXHJcbiAgICAgICAgICAgIGlmICghZHZzWzBdKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvd0VycihzIC8gMCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGR2ZCBpcyAwLCByZXR1cm4gKy0wLlxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJpZyhzICogMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZHZzTCwgZHZzVCwgbmV4dCwgY21wLCByZW1JLCB1LFxyXG4gICAgICAgICAgICBkdnNaID0gZHZzLnNsaWNlKCksXHJcbiAgICAgICAgICAgIGR2ZEkgPSBkdnNMID0gZHZzLmxlbmd0aCxcclxuICAgICAgICAgICAgZHZkTCA9IGR2ZC5sZW5ndGgsXHJcbiAgICAgICAgICAgIC8vIHJlbWFpbmRlclxyXG4gICAgICAgICAgICByZW0gPSBkdmQuc2xpY2UoMCwgZHZzTCksXHJcbiAgICAgICAgICAgIHJlbUwgPSByZW0ubGVuZ3RoLFxyXG4gICAgICAgICAgICAvLyBxdW90aWVudFxyXG4gICAgICAgICAgICBxID0geSxcclxuICAgICAgICAgICAgcWMgPSBxLmMgPSBbXSxcclxuICAgICAgICAgICAgcWkgPSAwLFxyXG4gICAgICAgICAgICBkaWdpdHMgPSBkcCArIChxLmUgPSB4LmUgLSB5LmUpICsgMTtcclxuXHJcbiAgICAgICAgcS5zID0gcztcclxuICAgICAgICBzID0gZGlnaXRzIDwgMCA/IDAgOiBkaWdpdHM7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB2ZXJzaW9uIG9mIGRpdmlzb3Igd2l0aCBsZWFkaW5nIHplcm8uXHJcbiAgICAgICAgZHZzWi51bnNoaWZ0KDApO1xyXG5cclxuICAgICAgICAvLyBBZGQgemVyb3MgdG8gbWFrZSByZW1haW5kZXIgYXMgbG9uZyBhcyBkaXZpc29yLlxyXG4gICAgICAgIGZvciAoOyByZW1MKysgPCBkdnNMOyByZW0ucHVzaCgwKSkge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG8ge1xyXG5cclxuICAgICAgICAgICAgLy8gJ25leHQnIGlzIGhvdyBtYW55IHRpbWVzIHRoZSBkaXZpc29yIGdvZXMgaW50byBjdXJyZW50IHJlbWFpbmRlci5cclxuICAgICAgICAgICAgZm9yIChuZXh0ID0gMDsgbmV4dCA8IDEwOyBuZXh0KyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDb21wYXJlIGRpdmlzb3IgYW5kIHJlbWFpbmRlci5cclxuICAgICAgICAgICAgICAgIGlmIChkdnNMICE9IChyZW1MID0gcmVtLmxlbmd0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjbXAgPSBkdnNMID4gcmVtTCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAocmVtSSA9IC0xLCBjbXAgPSAwOyArK3JlbUkgPCBkdnNMOykge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR2c1tyZW1JXSAhPSByZW1bcmVtSV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNtcCA9IGR2c1tyZW1JXSA+IHJlbVtyZW1JXSA/IDEgOiAtMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIElmIGRpdmlzb3IgPCByZW1haW5kZXIsIHN1YnRyYWN0IGRpdmlzb3IgZnJvbSByZW1haW5kZXIuXHJcbiAgICAgICAgICAgICAgICBpZiAoY21wIDwgMCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1haW5kZXIgY2FuJ3QgYmUgbW9yZSB0aGFuIDEgZGlnaXQgbG9uZ2VyIHRoYW4gZGl2aXNvci5cclxuICAgICAgICAgICAgICAgICAgICAvLyBFcXVhbGlzZSBsZW5ndGhzIHVzaW5nIGRpdmlzb3Igd2l0aCBleHRyYSBsZWFkaW5nIHplcm8/XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChkdnNUID0gcmVtTCA9PSBkdnNMID8gZHZzIDogZHZzWjsgcmVtTDspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1bLS1yZW1MXSA8IGR2c1RbcmVtTF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbUkgPSByZW1MO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoOyByZW1JICYmICFyZW1bLS1yZW1JXTsgcmVtW3JlbUldID0gOSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLS1yZW1bcmVtSV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1bcmVtTF0gKz0gMTA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtW3JlbUxdIC09IGR2c1RbcmVtTF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyAhcmVtWzBdOyByZW0uc2hpZnQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEFkZCB0aGUgJ25leHQnIGRpZ2l0IHRvIHRoZSByZXN1bHQgYXJyYXkuXHJcbiAgICAgICAgICAgIHFjW3FpKytdID0gY21wID8gbmV4dCA6ICsrbmV4dDtcclxuXHJcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgcmVtYWluZGVyLlxyXG4gICAgICAgICAgICBpZiAocmVtWzBdICYmIGNtcCkge1xyXG4gICAgICAgICAgICAgICAgcmVtW3JlbUxdID0gZHZkW2R2ZEldIHx8IDA7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZW0gPSBbIGR2ZFtkdmRJXSBdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gd2hpbGUgKChkdmRJKysgPCBkdmRMIHx8IHJlbVswXSAhPT0gdSkgJiYgcy0tKTtcclxuXHJcbiAgICAgICAgLy8gTGVhZGluZyB6ZXJvPyBEbyBub3QgcmVtb3ZlIGlmIHJlc3VsdCBpcyBzaW1wbHkgemVybyAocWkgPT0gMSkuXHJcbiAgICAgICAgaWYgKCFxY1swXSAmJiBxaSAhPSAxKSB7XHJcblxyXG4gICAgICAgICAgICAvLyBUaGVyZSBjYW4ndCBiZSBtb3JlIHRoYW4gb25lIHplcm8uXHJcbiAgICAgICAgICAgIHFjLnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIHEuZS0tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUm91bmQ/XHJcbiAgICAgICAgaWYgKHFpID4gZGlnaXRzKSB7XHJcbiAgICAgICAgICAgIHJuZChxLCBkcCwgQmlnLlJNLCByZW1bMF0gIT09IHUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHE7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIG9mIHRoaXMgQmlnIGlzIGVxdWFsIHRvIHRoZSB2YWx1ZSBvZiBCaWcgeSxcclxuICAgICAqIG90aGVyd2lzZSByZXR1cm5zIGZhbHNlLlxyXG4gICAgICovXHJcbiAgICBQLmVxID0gZnVuY3Rpb24gKHkpIHtcclxuICAgICAgICByZXR1cm4gIXRoaXMuY21wKHkpO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAqIFJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBvZiB0aGlzIEJpZyBpcyBncmVhdGVyIHRoYW4gdGhlIHZhbHVlIG9mIEJpZyB5LFxyXG4gICAgICogb3RoZXJ3aXNlIHJldHVybnMgZmFsc2UuXHJcbiAgICAgKi9cclxuICAgIFAuZ3QgPSBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNtcCh5KSA+IDA7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIG9mIHRoaXMgQmlnIGlzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byB0aGVcclxuICAgICAqIHZhbHVlIG9mIEJpZyB5LCBvdGhlcndpc2UgcmV0dXJucyBmYWxzZS5cclxuICAgICAqL1xyXG4gICAgUC5ndGUgPSBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNtcCh5KSA+IC0xO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAqIFJldHVybiB0cnVlIGlmIHRoZSB2YWx1ZSBvZiB0aGlzIEJpZyBpcyBsZXNzIHRoYW4gdGhlIHZhbHVlIG9mIEJpZyB5LFxyXG4gICAgICogb3RoZXJ3aXNlIHJldHVybnMgZmFsc2UuXHJcbiAgICAgKi9cclxuICAgIFAubHQgPSBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNtcCh5KSA8IDA7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIHRydWUgaWYgdGhlIHZhbHVlIG9mIHRoaXMgQmlnIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byB0aGUgdmFsdWVcclxuICAgICAqIG9mIEJpZyB5LCBvdGhlcndpc2UgcmV0dXJucyBmYWxzZS5cclxuICAgICAqL1xyXG4gICAgUC5sdGUgPSBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgICByZXR1cm4gdGhpcy5jbXAoeSkgPCAxO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAqIFJldHVybiBhIG5ldyBCaWcgd2hvc2UgdmFsdWUgaXMgdGhlIHZhbHVlIG9mIHRoaXMgQmlnIG1pbnVzIHRoZSB2YWx1ZVxyXG4gICAgICogb2YgQmlnIHkuXHJcbiAgICAgKi9cclxuICAgIFAuc3ViID0gUC5taW51cyA9IGZ1bmN0aW9uICh5KSB7XHJcbiAgICAgICAgdmFyIGksIGosIHQsIHhMVHksXHJcbiAgICAgICAgICAgIHggPSB0aGlzLFxyXG4gICAgICAgICAgICBCaWcgPSB4LmNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICBhID0geC5zLFxyXG4gICAgICAgICAgICBiID0gKHkgPSBuZXcgQmlnKHkpKS5zO1xyXG5cclxuICAgICAgICAvLyBTaWducyBkaWZmZXI/XHJcbiAgICAgICAgaWYgKGEgIT0gYikge1xyXG4gICAgICAgICAgICB5LnMgPSAtYjtcclxuICAgICAgICAgICAgcmV0dXJuIHgucGx1cyh5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB4YyA9IHguYy5zbGljZSgpLFxyXG4gICAgICAgICAgICB4ZSA9IHguZSxcclxuICAgICAgICAgICAgeWMgPSB5LmMsXHJcbiAgICAgICAgICAgIHllID0geS5lO1xyXG5cclxuICAgICAgICAvLyBFaXRoZXIgemVybz9cclxuICAgICAgICBpZiAoIXhjWzBdIHx8ICF5Y1swXSkge1xyXG5cclxuICAgICAgICAgICAgLy8geSBpcyBub24temVybz8geCBpcyBub24temVybz8gT3IgYm90aCBhcmUgemVyby5cclxuICAgICAgICAgICAgcmV0dXJuIHljWzBdID8gKHkucyA9IC1iLCB5KSA6IG5ldyBCaWcoeGNbMF0gPyB4IDogMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggaXMgdGhlIGJpZ2dlciBudW1iZXIuXHJcbiAgICAgICAgLy8gUHJlcGVuZCB6ZXJvcyB0byBlcXVhbGlzZSBleHBvbmVudHMuXHJcbiAgICAgICAgaWYgKGEgPSB4ZSAtIHllKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoeExUeSA9IGEgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICBhID0gLWE7XHJcbiAgICAgICAgICAgICAgICB0ID0geGM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB5ZSA9IHhlO1xyXG4gICAgICAgICAgICAgICAgdCA9IHljO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0LnJldmVyc2UoKTtcclxuICAgICAgICAgICAgZm9yIChiID0gYTsgYi0tOyB0LnB1c2goMCkpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0LnJldmVyc2UoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgLy8gRXhwb25lbnRzIGVxdWFsLiBDaGVjayBkaWdpdCBieSBkaWdpdC5cclxuICAgICAgICAgICAgaiA9ICgoeExUeSA9IHhjLmxlbmd0aCA8IHljLmxlbmd0aCkgPyB4YyA6IHljKS5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGEgPSBiID0gMDsgYiA8IGo7IGIrKykge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh4Y1tiXSAhPSB5Y1tiXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHhMVHkgPSB4Y1tiXSA8IHljW2JdO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB4IDwgeT8gUG9pbnQgeGMgdG8gdGhlIGFycmF5IG9mIHRoZSBiaWdnZXIgbnVtYmVyLlxyXG4gICAgICAgIGlmICh4TFR5KSB7XHJcbiAgICAgICAgICAgIHQgPSB4YztcclxuICAgICAgICAgICAgeGMgPSB5YztcclxuICAgICAgICAgICAgeWMgPSB0O1xyXG4gICAgICAgICAgICB5LnMgPSAteS5zO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLypcclxuICAgICAgICAgKiBBcHBlbmQgemVyb3MgdG8geGMgaWYgc2hvcnRlci4gTm8gbmVlZCB0byBhZGQgemVyb3MgdG8geWMgaWYgc2hvcnRlclxyXG4gICAgICAgICAqIGFzIHN1YnRyYWN0aW9uIG9ubHkgbmVlZHMgdG8gc3RhcnQgYXQgeWMubGVuZ3RoLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGlmICgoIGIgPSAoaiA9IHljLmxlbmd0aCkgLSAoaSA9IHhjLmxlbmd0aCkgKSA+IDApIHtcclxuXHJcbiAgICAgICAgICAgIGZvciAoOyBiLS07IHhjW2krK10gPSAwKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFN1YnRyYWN0IHljIGZyb20geGMuXHJcbiAgICAgICAgZm9yIChiID0gaTsgaiA+IGE7KXtcclxuXHJcbiAgICAgICAgICAgIGlmICh4Y1stLWpdIDwgeWNbal0pIHtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSBqOyBpICYmICF4Y1stLWldOyB4Y1tpXSA9IDkpIHtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC0teGNbaV07XHJcbiAgICAgICAgICAgICAgICB4Y1tqXSArPSAxMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB4Y1tqXSAtPSB5Y1tqXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSB0cmFpbGluZyB6ZXJvcy5cclxuICAgICAgICBmb3IgKDsgeGNbLS1iXSA9PT0gMDsgeGMucG9wKCkpIHtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSBsZWFkaW5nIHplcm9zIGFuZCBhZGp1c3QgZXhwb25lbnQgYWNjb3JkaW5nbHkuXHJcbiAgICAgICAgZm9yICg7IHhjWzBdID09PSAwOykge1xyXG4gICAgICAgICAgICB4Yy5zaGlmdCgpO1xyXG4gICAgICAgICAgICAtLXllO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF4Y1swXSkge1xyXG5cclxuICAgICAgICAgICAgLy8gbiAtIG4gPSArMFxyXG4gICAgICAgICAgICB5LnMgPSAxO1xyXG5cclxuICAgICAgICAgICAgLy8gUmVzdWx0IG11c3QgYmUgemVyby5cclxuICAgICAgICAgICAgeGMgPSBbeWUgPSAwXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHkuYyA9IHhjO1xyXG4gICAgICAgIHkuZSA9IHllO1xyXG5cclxuICAgICAgICByZXR1cm4geTtcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBSZXR1cm4gYSBuZXcgQmlnIHdob3NlIHZhbHVlIGlzIHRoZSB2YWx1ZSBvZiB0aGlzIEJpZyBtb2R1bG8gdGhlXHJcbiAgICAgKiB2YWx1ZSBvZiBCaWcgeS5cclxuICAgICAqL1xyXG4gICAgUC5tb2QgPSBmdW5jdGlvbiAoeSkge1xyXG4gICAgICAgIHZhciB5R1R4LFxyXG4gICAgICAgICAgICB4ID0gdGhpcyxcclxuICAgICAgICAgICAgQmlnID0geC5jb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgYSA9IHgucyxcclxuICAgICAgICAgICAgYiA9ICh5ID0gbmV3IEJpZyh5KSkucztcclxuXHJcbiAgICAgICAgaWYgKCF5LmNbMF0pIHtcclxuICAgICAgICAgICAgdGhyb3dFcnIoTmFOKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHgucyA9IHkucyA9IDE7XHJcbiAgICAgICAgeUdUeCA9IHkuY21wKHgpID09IDE7XHJcbiAgICAgICAgeC5zID0gYTtcclxuICAgICAgICB5LnMgPSBiO1xyXG5cclxuICAgICAgICBpZiAoeUdUeCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJpZyh4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGEgPSBCaWcuRFA7XHJcbiAgICAgICAgYiA9IEJpZy5STTtcclxuICAgICAgICBCaWcuRFAgPSBCaWcuUk0gPSAwO1xyXG4gICAgICAgIHggPSB4LmRpdih5KTtcclxuICAgICAgICBCaWcuRFAgPSBhO1xyXG4gICAgICAgIEJpZy5STSA9IGI7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLm1pbnVzKCB4LnRpbWVzKHkpICk7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgbmV3IEJpZyB3aG9zZSB2YWx1ZSBpcyB0aGUgdmFsdWUgb2YgdGhpcyBCaWcgcGx1cyB0aGUgdmFsdWVcclxuICAgICAqIG9mIEJpZyB5LlxyXG4gICAgICovXHJcbiAgICBQLmFkZCA9IFAucGx1cyA9IGZ1bmN0aW9uICh5KSB7XHJcbiAgICAgICAgdmFyIHQsXHJcbiAgICAgICAgICAgIHggPSB0aGlzLFxyXG4gICAgICAgICAgICBCaWcgPSB4LmNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICBhID0geC5zLFxyXG4gICAgICAgICAgICBiID0gKHkgPSBuZXcgQmlnKHkpKS5zO1xyXG5cclxuICAgICAgICAvLyBTaWducyBkaWZmZXI/XHJcbiAgICAgICAgaWYgKGEgIT0gYikge1xyXG4gICAgICAgICAgICB5LnMgPSAtYjtcclxuICAgICAgICAgICAgcmV0dXJuIHgubWludXMoeSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgeGUgPSB4LmUsXHJcbiAgICAgICAgICAgIHhjID0geC5jLFxyXG4gICAgICAgICAgICB5ZSA9IHkuZSxcclxuICAgICAgICAgICAgeWMgPSB5LmM7XHJcblxyXG4gICAgICAgIC8vIEVpdGhlciB6ZXJvP1xyXG4gICAgICAgIGlmICgheGNbMF0gfHwgIXljWzBdKSB7XHJcblxyXG4gICAgICAgICAgICAvLyB5IGlzIG5vbi16ZXJvPyB4IGlzIG5vbi16ZXJvPyBPciBib3RoIGFyZSB6ZXJvLlxyXG4gICAgICAgICAgICByZXR1cm4geWNbMF0gPyB5IDogbmV3IEJpZyh4Y1swXSA/IHggOiBhICogMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHhjID0geGMuc2xpY2UoKTtcclxuXHJcbiAgICAgICAgLy8gUHJlcGVuZCB6ZXJvcyB0byBlcXVhbGlzZSBleHBvbmVudHMuXHJcbiAgICAgICAgLy8gTm90ZTogRmFzdGVyIHRvIHVzZSByZXZlcnNlIHRoZW4gZG8gdW5zaGlmdHMuXHJcbiAgICAgICAgaWYgKGEgPSB4ZSAtIHllKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoYSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHllID0geGU7XHJcbiAgICAgICAgICAgICAgICB0ID0geWM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhID0gLWE7XHJcbiAgICAgICAgICAgICAgICB0ID0geGM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHQucmV2ZXJzZSgpO1xyXG4gICAgICAgICAgICBmb3IgKDsgYS0tOyB0LnB1c2goMCkpIHtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0LnJldmVyc2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBvaW50IHhjIHRvIHRoZSBsb25nZXIgYXJyYXkuXHJcbiAgICAgICAgaWYgKHhjLmxlbmd0aCAtIHljLmxlbmd0aCA8IDApIHtcclxuICAgICAgICAgICAgdCA9IHljO1xyXG4gICAgICAgICAgICB5YyA9IHhjO1xyXG4gICAgICAgICAgICB4YyA9IHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGEgPSB5Yy5sZW5ndGg7XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICogT25seSBzdGFydCBhZGRpbmcgYXQgeWMubGVuZ3RoIC0gMSBhcyB0aGUgZnVydGhlciBkaWdpdHMgb2YgeGMgY2FuIGJlXHJcbiAgICAgICAgICogbGVmdCBhcyB0aGV5IGFyZS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBmb3IgKGIgPSAwOyBhOykge1xyXG4gICAgICAgICAgICBiID0gKHhjWy0tYV0gPSB4Y1thXSArIHljW2FdICsgYikgLyAxMCB8IDA7XHJcbiAgICAgICAgICAgIHhjW2FdICU9IDEwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gTm8gbmVlZCB0byBjaGVjayBmb3IgemVybywgYXMgK3ggKyAreSAhPSAwICYmIC14ICsgLXkgIT0gMFxyXG5cclxuICAgICAgICBpZiAoYikge1xyXG4gICAgICAgICAgICB4Yy51bnNoaWZ0KGIpO1xyXG4gICAgICAgICAgICArK3llO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgIC8vIFJlbW92ZSB0cmFpbGluZyB6ZXJvcy5cclxuICAgICAgICBmb3IgKGEgPSB4Yy5sZW5ndGg7IHhjWy0tYV0gPT09IDA7IHhjLnBvcCgpKSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB5LmMgPSB4YztcclxuICAgICAgICB5LmUgPSB5ZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHk7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgQmlnIHdob3NlIHZhbHVlIGlzIHRoZSB2YWx1ZSBvZiB0aGlzIEJpZyByYWlzZWQgdG8gdGhlIHBvd2VyIG4uXHJcbiAgICAgKiBJZiBuIGlzIG5lZ2F0aXZlLCByb3VuZCwgaWYgbmVjZXNzYXJ5LCB0byBhIG1heGltdW0gb2YgQmlnLkRQIGRlY2ltYWxcclxuICAgICAqIHBsYWNlcyB1c2luZyByb3VuZGluZyBtb2RlIEJpZy5STS5cclxuICAgICAqXHJcbiAgICAgKiBuIHtudW1iZXJ9IEludGVnZXIsIC1NQVhfUE9XRVIgdG8gTUFYX1BPV0VSIGluY2x1c2l2ZS5cclxuICAgICAqL1xyXG4gICAgUC5wb3cgPSBmdW5jdGlvbiAobikge1xyXG4gICAgICAgIHZhciB4ID0gdGhpcyxcclxuICAgICAgICAgICAgb25lID0gbmV3IHguY29uc3RydWN0b3IoMSksXHJcbiAgICAgICAgICAgIHkgPSBvbmUsXHJcbiAgICAgICAgICAgIGlzTmVnID0gbiA8IDA7XHJcblxyXG4gICAgICAgIGlmIChuICE9PSB+fm4gfHwgbiA8IC1NQVhfUE9XRVIgfHwgbiA+IE1BWF9QT1dFUikge1xyXG4gICAgICAgICAgICB0aHJvd0VycignIXBvdyEnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG4gPSBpc05lZyA/IC1uIDogbjtcclxuXHJcbiAgICAgICAgZm9yICg7Oykge1xyXG5cclxuICAgICAgICAgICAgaWYgKG4gJiAxKSB7XHJcbiAgICAgICAgICAgICAgICB5ID0geS50aW1lcyh4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuID4+PSAxO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFuKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB4ID0geC50aW1lcyh4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpc05lZyA/IG9uZS5kaXYoeSkgOiB5O1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAqIFJldHVybiBhIG5ldyBCaWcgd2hvc2UgdmFsdWUgaXMgdGhlIHZhbHVlIG9mIHRoaXMgQmlnIHJvdW5kZWQgdG8gYVxyXG4gICAgICogbWF4aW11bSBvZiBkcCBkZWNpbWFsIHBsYWNlcyB1c2luZyByb3VuZGluZyBtb2RlIHJtLlxyXG4gICAgICogSWYgZHAgaXMgbm90IHNwZWNpZmllZCwgcm91bmQgdG8gMCBkZWNpbWFsIHBsYWNlcy5cclxuICAgICAqIElmIHJtIGlzIG5vdCBzcGVjaWZpZWQsIHVzZSBCaWcuUk0uXHJcbiAgICAgKlxyXG4gICAgICogW2RwXSB7bnVtYmVyfSBJbnRlZ2VyLCAwIHRvIE1BWF9EUCBpbmNsdXNpdmUuXHJcbiAgICAgKiBbcm1dIDAsIDEsIDIgb3IgMyAoUk9VTkRfRE9XTiwgUk9VTkRfSEFMRl9VUCwgUk9VTkRfSEFMRl9FVkVOLCBST1VORF9VUClcclxuICAgICAqL1xyXG4gICAgUC5yb3VuZCA9IGZ1bmN0aW9uIChkcCwgcm0pIHtcclxuICAgICAgICB2YXIgeCA9IHRoaXMsXHJcbiAgICAgICAgICAgIEJpZyA9IHguY29uc3RydWN0b3I7XHJcblxyXG4gICAgICAgIGlmIChkcCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGRwID0gMDtcclxuICAgICAgICB9IGVsc2UgaWYgKGRwICE9PSB+fmRwIHx8IGRwIDwgMCB8fCBkcCA+IE1BWF9EUCkge1xyXG4gICAgICAgICAgICB0aHJvd0VycignIXJvdW5kIScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBybmQoeCA9IG5ldyBCaWcoeCksIGRwLCBybSA9PSBudWxsID8gQmlnLlJNIDogcm0pO1xyXG5cclxuICAgICAgICByZXR1cm4geDtcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBSZXR1cm4gYSBuZXcgQmlnIHdob3NlIHZhbHVlIGlzIHRoZSBzcXVhcmUgcm9vdCBvZiB0aGUgdmFsdWUgb2YgdGhpcyBCaWcsXHJcbiAgICAgKiByb3VuZGVkLCBpZiBuZWNlc3NhcnksIHRvIGEgbWF4aW11bSBvZiBCaWcuRFAgZGVjaW1hbCBwbGFjZXMgdXNpbmdcclxuICAgICAqIHJvdW5kaW5nIG1vZGUgQmlnLlJNLlxyXG4gICAgICovXHJcbiAgICBQLnNxcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGVzdGltYXRlLCByLCBhcHByb3gsXHJcbiAgICAgICAgICAgIHggPSB0aGlzLFxyXG4gICAgICAgICAgICBCaWcgPSB4LmNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICB4YyA9IHguYyxcclxuICAgICAgICAgICAgaSA9IHgucyxcclxuICAgICAgICAgICAgZSA9IHguZSxcclxuICAgICAgICAgICAgaGFsZiA9IG5ldyBCaWcoJzAuNScpO1xyXG5cclxuICAgICAgICAvLyBaZXJvP1xyXG4gICAgICAgIGlmICgheGNbMF0pIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCaWcoeCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJZiBuZWdhdGl2ZSwgdGhyb3cgTmFOLlxyXG4gICAgICAgIGlmIChpIDwgMCkge1xyXG4gICAgICAgICAgICB0aHJvd0VycihOYU4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXN0aW1hdGUuXHJcbiAgICAgICAgaSA9IE1hdGguc3FydCh4LnRvU3RyaW5nKCkpO1xyXG5cclxuICAgICAgICAvLyBNYXRoLnNxcnQgdW5kZXJmbG93L292ZXJmbG93P1xyXG4gICAgICAgIC8vIFBhc3MgeCB0byBNYXRoLnNxcnQgYXMgaW50ZWdlciwgdGhlbiBhZGp1c3QgdGhlIHJlc3VsdCBleHBvbmVudC5cclxuICAgICAgICBpZiAoaSA9PT0gMCB8fCBpID09PSAxIC8gMCkge1xyXG4gICAgICAgICAgICBlc3RpbWF0ZSA9IHhjLmpvaW4oJycpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCEoZXN0aW1hdGUubGVuZ3RoICsgZSAmIDEpKSB7XHJcbiAgICAgICAgICAgICAgICBlc3RpbWF0ZSArPSAnMCc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHIgPSBuZXcgQmlnKCBNYXRoLnNxcnQoZXN0aW1hdGUpLnRvU3RyaW5nKCkgKTtcclxuICAgICAgICAgICAgci5lID0gKChlICsgMSkgLyAyIHwgMCkgLSAoZSA8IDAgfHwgZSAmIDEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHIgPSBuZXcgQmlnKGkudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpID0gci5lICsgKEJpZy5EUCArPSA0KTtcclxuXHJcbiAgICAgICAgLy8gTmV3dG9uLVJhcGhzb24gaXRlcmF0aW9uLlxyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgYXBwcm94ID0gcjtcclxuICAgICAgICAgICAgciA9IGhhbGYudGltZXMoIGFwcHJveC5wbHVzKCB4LmRpdihhcHByb3gpICkgKTtcclxuICAgICAgICB9IHdoaWxlICggYXBwcm94LmMuc2xpY2UoMCwgaSkuam9pbignJykgIT09XHJcbiAgICAgICAgICAgICAgICAgICAgICAgci5jLnNsaWNlKDAsIGkpLmpvaW4oJycpICk7XHJcblxyXG4gICAgICAgIHJuZChyLCBCaWcuRFAgLT0gNCwgQmlnLlJNKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHI7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgbmV3IEJpZyB3aG9zZSB2YWx1ZSBpcyB0aGUgdmFsdWUgb2YgdGhpcyBCaWcgdGltZXMgdGhlIHZhbHVlIG9mXHJcbiAgICAgKiBCaWcgeS5cclxuICAgICAqL1xyXG4gICAgUC5tdWwgPSBQLnRpbWVzID0gZnVuY3Rpb24gKHkpIHtcclxuICAgICAgICB2YXIgYyxcclxuICAgICAgICAgICAgeCA9IHRoaXMsXHJcbiAgICAgICAgICAgIEJpZyA9IHguY29uc3RydWN0b3IsXHJcbiAgICAgICAgICAgIHhjID0geC5jLFxyXG4gICAgICAgICAgICB5YyA9ICh5ID0gbmV3IEJpZyh5KSkuYyxcclxuICAgICAgICAgICAgYSA9IHhjLmxlbmd0aCxcclxuICAgICAgICAgICAgYiA9IHljLmxlbmd0aCxcclxuICAgICAgICAgICAgaSA9IHguZSxcclxuICAgICAgICAgICAgaiA9IHkuZTtcclxuXHJcbiAgICAgICAgLy8gRGV0ZXJtaW5lIHNpZ24gb2YgcmVzdWx0LlxyXG4gICAgICAgIHkucyA9IHgucyA9PSB5LnMgPyAxIDogLTE7XHJcblxyXG4gICAgICAgIC8vIFJldHVybiBzaWduZWQgMCBpZiBlaXRoZXIgMC5cclxuICAgICAgICBpZiAoIXhjWzBdIHx8ICF5Y1swXSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJpZyh5LnMgKiAwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEluaXRpYWxpc2UgZXhwb25lbnQgb2YgcmVzdWx0IGFzIHguZSArIHkuZS5cclxuICAgICAgICB5LmUgPSBpICsgajtcclxuXHJcbiAgICAgICAgLy8gSWYgYXJyYXkgeGMgaGFzIGZld2VyIGRpZ2l0cyB0aGFuIHljLCBzd2FwIHhjIGFuZCB5YywgYW5kIGxlbmd0aHMuXHJcbiAgICAgICAgaWYgKGEgPCBiKSB7XHJcbiAgICAgICAgICAgIGMgPSB4YztcclxuICAgICAgICAgICAgeGMgPSB5YztcclxuICAgICAgICAgICAgeWMgPSBjO1xyXG4gICAgICAgICAgICBqID0gYTtcclxuICAgICAgICAgICAgYSA9IGI7XHJcbiAgICAgICAgICAgIGIgPSBqO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW5pdGlhbGlzZSBjb2VmZmljaWVudCBhcnJheSBvZiByZXN1bHQgd2l0aCB6ZXJvcy5cclxuICAgICAgICBmb3IgKGMgPSBuZXcgQXJyYXkoaiA9IGEgKyBiKTsgai0tOyBjW2pdID0gMCkge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gTXVsdGlwbHkuXHJcblxyXG4gICAgICAgIC8vIGkgaXMgaW5pdGlhbGx5IHhjLmxlbmd0aC5cclxuICAgICAgICBmb3IgKGkgPSBiOyBpLS07KSB7XHJcbiAgICAgICAgICAgIGIgPSAwO1xyXG5cclxuICAgICAgICAgICAgLy8gYSBpcyB5Yy5sZW5ndGguXHJcbiAgICAgICAgICAgIGZvciAoaiA9IGEgKyBpOyBqID4gaTspIHtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDdXJyZW50IHN1bSBvZiBwcm9kdWN0cyBhdCB0aGlzIGRpZ2l0IHBvc2l0aW9uLCBwbHVzIGNhcnJ5LlxyXG4gICAgICAgICAgICAgICAgYiA9IGNbal0gKyB5Y1tpXSAqIHhjW2ogLSBpIC0gMV0gKyBiO1xyXG4gICAgICAgICAgICAgICAgY1tqLS1dID0gYiAlIDEwO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNhcnJ5XHJcbiAgICAgICAgICAgICAgICBiID0gYiAvIDEwIHwgMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjW2pdID0gKGNbal0gKyBiKSAlIDEwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW5jcmVtZW50IHJlc3VsdCBleHBvbmVudCBpZiB0aGVyZSBpcyBhIGZpbmFsIGNhcnJ5LlxyXG4gICAgICAgIGlmIChiKSB7XHJcbiAgICAgICAgICAgICsreS5lO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBsZWFkaW5nIHplcm8uXHJcbiAgICAgICAgaWYgKCFjWzBdKSB7XHJcbiAgICAgICAgICAgIGMuc2hpZnQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSB0cmFpbGluZyB6ZXJvcy5cclxuICAgICAgICBmb3IgKGkgPSBjLmxlbmd0aDsgIWNbLS1pXTsgYy5wb3AoKSkge1xyXG4gICAgICAgIH1cclxuICAgICAgICB5LmMgPSBjO1xyXG5cclxuICAgICAgICByZXR1cm4geTtcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBSZXR1cm4gYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiB0aGlzIEJpZy5cclxuICAgICAqIFJldHVybiBleHBvbmVudGlhbCBub3RhdGlvbiBpZiB0aGlzIEJpZyBoYXMgYSBwb3NpdGl2ZSBleHBvbmVudCBlcXVhbCB0b1xyXG4gICAgICogb3IgZ3JlYXRlciB0aGFuIEJpZy5FX1BPUywgb3IgYSBuZWdhdGl2ZSBleHBvbmVudCBlcXVhbCB0byBvciBsZXNzIHRoYW5cclxuICAgICAqIEJpZy5FX05FRy5cclxuICAgICAqL1xyXG4gICAgUC50b1N0cmluZyA9IFAudmFsdWVPZiA9IFAudG9KU09OID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciB4ID0gdGhpcyxcclxuICAgICAgICAgICAgQmlnID0geC5jb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgZSA9IHguZSxcclxuICAgICAgICAgICAgc3RyID0geC5jLmpvaW4oJycpLFxyXG4gICAgICAgICAgICBzdHJMID0gc3RyLmxlbmd0aDtcclxuXHJcbiAgICAgICAgLy8gRXhwb25lbnRpYWwgbm90YXRpb24/XHJcbiAgICAgICAgaWYgKGUgPD0gQmlnLkVfTkVHIHx8IGUgPj0gQmlnLkVfUE9TKSB7XHJcbiAgICAgICAgICAgIHN0ciA9IHN0ci5jaGFyQXQoMCkgKyAoc3RyTCA+IDEgPyAnLicgKyBzdHIuc2xpY2UoMSkgOiAnJykgK1xyXG4gICAgICAgICAgICAgIChlIDwgMCA/ICdlJyA6ICdlKycpICsgZTtcclxuXHJcbiAgICAgICAgLy8gTmVnYXRpdmUgZXhwb25lbnQ/XHJcbiAgICAgICAgfSBlbHNlIGlmIChlIDwgMCkge1xyXG5cclxuICAgICAgICAgICAgLy8gUHJlcGVuZCB6ZXJvcy5cclxuICAgICAgICAgICAgZm9yICg7ICsrZTsgc3RyID0gJzAnICsgc3RyKSB7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc3RyID0gJzAuJyArIHN0cjtcclxuXHJcbiAgICAgICAgLy8gUG9zaXRpdmUgZXhwb25lbnQ/XHJcbiAgICAgICAgfSBlbHNlIGlmIChlID4gMCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKCsrZSA+IHN0ckwpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBBcHBlbmQgemVyb3MuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGUgLT0gc3RyTDsgZS0tIDsgc3RyICs9ICcwJykge1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUgPCBzdHJMKSB7XHJcbiAgICAgICAgICAgICAgICBzdHIgPSBzdHIuc2xpY2UoMCwgZSkgKyAnLicgKyBzdHIuc2xpY2UoZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXhwb25lbnQgemVyby5cclxuICAgICAgICB9IGVsc2UgaWYgKHN0ckwgPiAxKSB7XHJcbiAgICAgICAgICAgIHN0ciA9IHN0ci5jaGFyQXQoMCkgKyAnLicgKyBzdHIuc2xpY2UoMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBBdm9pZCAnLTAnXHJcbiAgICAgICAgcmV0dXJuIHgucyA8IDAgJiYgeC5jWzBdID8gJy0nICsgc3RyIDogc3RyO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuICAgICAqIElmIHRvRXhwb25lbnRpYWwsIHRvRml4ZWQsIHRvUHJlY2lzaW9uIGFuZCBmb3JtYXQgYXJlIG5vdCByZXF1aXJlZCB0aGV5XHJcbiAgICAgKiBjYW4gc2FmZWx5IGJlIGNvbW1lbnRlZC1vdXQgb3IgZGVsZXRlZC4gTm8gcmVkdW5kYW50IGNvZGUgd2lsbCBiZSBsZWZ0LlxyXG4gICAgICogZm9ybWF0IGlzIHVzZWQgb25seSBieSB0b0V4cG9uZW50aWFsLCB0b0ZpeGVkIGFuZCB0b1ByZWNpc2lvbi5cclxuICAgICAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuICAgICAqL1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgdGhpcyBCaWcgaW4gZXhwb25lbnRpYWxcclxuICAgICAqIG5vdGF0aW9uIHRvIGRwIGZpeGVkIGRlY2ltYWwgcGxhY2VzIGFuZCByb3VuZGVkLCBpZiBuZWNlc3NhcnksIHVzaW5nXHJcbiAgICAgKiBCaWcuUk0uXHJcbiAgICAgKlxyXG4gICAgICogW2RwXSB7bnVtYmVyfSBJbnRlZ2VyLCAwIHRvIE1BWF9EUCBpbmNsdXNpdmUuXHJcbiAgICAgKi9cclxuICAgIFAudG9FeHBvbmVudGlhbCA9IGZ1bmN0aW9uIChkcCkge1xyXG5cclxuICAgICAgICBpZiAoZHAgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBkcCA9IHRoaXMuYy5sZW5ndGggLSAxO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZHAgIT09IH5+ZHAgfHwgZHAgPCAwIHx8IGRwID4gTUFYX0RQKSB7XHJcbiAgICAgICAgICAgIHRocm93RXJyKCchdG9FeHAhJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZm9ybWF0KHRoaXMsIGRwLCAxKTtcclxuICAgIH07XHJcblxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBSZXR1cm4gYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSB2YWx1ZSBvZiB0aGlzIEJpZyBpbiBub3JtYWwgbm90YXRpb25cclxuICAgICAqIHRvIGRwIGZpeGVkIGRlY2ltYWwgcGxhY2VzIGFuZCByb3VuZGVkLCBpZiBuZWNlc3NhcnksIHVzaW5nIEJpZy5STS5cclxuICAgICAqXHJcbiAgICAgKiBbZHBdIHtudW1iZXJ9IEludGVnZXIsIDAgdG8gTUFYX0RQIGluY2x1c2l2ZS5cclxuICAgICAqL1xyXG4gICAgUC50b0ZpeGVkID0gZnVuY3Rpb24gKGRwKSB7XHJcbiAgICAgICAgdmFyIHN0cixcclxuICAgICAgICAgICAgeCA9IHRoaXMsXHJcbiAgICAgICAgICAgIEJpZyA9IHguY29uc3RydWN0b3IsXHJcbiAgICAgICAgICAgIG5lZyA9IEJpZy5FX05FRyxcclxuICAgICAgICAgICAgcG9zID0gQmlnLkVfUE9TO1xyXG5cclxuICAgICAgICAvLyBQcmV2ZW50IHRoZSBwb3NzaWJpbGl0eSBvZiBleHBvbmVudGlhbCBub3RhdGlvbi5cclxuICAgICAgICBCaWcuRV9ORUcgPSAtKEJpZy5FX1BPUyA9IDEgLyAwKTtcclxuXHJcbiAgICAgICAgaWYgKGRwID09IG51bGwpIHtcclxuICAgICAgICAgICAgc3RyID0geC50b1N0cmluZygpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZHAgPT09IH5+ZHAgJiYgZHAgPj0gMCAmJiBkcCA8PSBNQVhfRFApIHtcclxuICAgICAgICAgICAgc3RyID0gZm9ybWF0KHgsIHguZSArIGRwKTtcclxuXHJcbiAgICAgICAgICAgIC8vICgtMCkudG9GaXhlZCgpIGlzICcwJywgYnV0ICgtMC4xKS50b0ZpeGVkKCkgaXMgJy0wJy5cclxuICAgICAgICAgICAgLy8gKC0wKS50b0ZpeGVkKDEpIGlzICcwLjAnLCBidXQgKC0wLjAxKS50b0ZpeGVkKDEpIGlzICctMC4wJy5cclxuICAgICAgICAgICAgaWYgKHgucyA8IDAgJiYgeC5jWzBdICYmIHN0ci5pbmRleE9mKCctJykgPCAwKSB7XHJcbiAgICAgICAgLy9FLmcuIC0wLjUgaWYgcm91bmRlZCB0byAtMCB3aWxsIGNhdXNlIHRvU3RyaW5nIHRvIG9taXQgdGhlIG1pbnVzIHNpZ24uXHJcbiAgICAgICAgICAgICAgICBzdHIgPSAnLScgKyBzdHI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgQmlnLkVfTkVHID0gbmVnO1xyXG4gICAgICAgIEJpZy5FX1BPUyA9IHBvcztcclxuXHJcbiAgICAgICAgaWYgKCFzdHIpIHtcclxuICAgICAgICAgICAgdGhyb3dFcnIoJyF0b0ZpeCEnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBzdHI7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgdmFsdWUgb2YgdGhpcyBCaWcgcm91bmRlZCB0byBzZFxyXG4gICAgICogc2lnbmlmaWNhbnQgZGlnaXRzIHVzaW5nIEJpZy5STS4gVXNlIGV4cG9uZW50aWFsIG5vdGF0aW9uIGlmIHNkIGlzIGxlc3NcclxuICAgICAqIHRoYW4gdGhlIG51bWJlciBvZiBkaWdpdHMgbmVjZXNzYXJ5IHRvIHJlcHJlc2VudCB0aGUgaW50ZWdlciBwYXJ0IG9mIHRoZVxyXG4gICAgICogdmFsdWUgaW4gbm9ybWFsIG5vdGF0aW9uLlxyXG4gICAgICpcclxuICAgICAqIHNkIHtudW1iZXJ9IEludGVnZXIsIDEgdG8gTUFYX0RQIGluY2x1c2l2ZS5cclxuICAgICAqL1xyXG4gICAgUC50b1ByZWNpc2lvbiA9IGZ1bmN0aW9uIChzZCkge1xyXG5cclxuICAgICAgICBpZiAoc2QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoc2QgIT09IH5+c2QgfHwgc2QgPCAxIHx8IHNkID4gTUFYX0RQKSB7XHJcbiAgICAgICAgICAgIHRocm93RXJyKCchdG9QcmUhJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZm9ybWF0KHRoaXMsIHNkIC0gMSwgMik7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvLyBFeHBvcnRcclxuXHJcblxyXG4gICAgQmlnID0gYmlnRmFjdG9yeSgpO1xyXG5cclxuICAgIC8vQU1ELlxyXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBCaWc7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gTm9kZSBhbmQgb3RoZXIgQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLlxyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gQmlnO1xyXG5cclxuICAgIC8vQnJvd3Nlci5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZ2xvYmFsLkJpZyA9IEJpZztcclxuICAgIH1cclxufSkodGhpcyk7XHJcbiIsIjsoZnVuY3Rpb24gKCkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0LyoqXG5cdCAqIEBwcmVzZXJ2ZSBGYXN0Q2xpY2s6IHBvbHlmaWxsIHRvIHJlbW92ZSBjbGljayBkZWxheXMgb24gYnJvd3NlcnMgd2l0aCB0b3VjaCBVSXMuXG5cdCAqXG5cdCAqIEBjb2RpbmdzdGFuZGFyZCBmdGxhYnMtanN2MlxuXHQgKiBAY29weXJpZ2h0IFRoZSBGaW5hbmNpYWwgVGltZXMgTGltaXRlZCBbQWxsIFJpZ2h0cyBSZXNlcnZlZF1cblx0ICogQGxpY2Vuc2UgTUlUIExpY2Vuc2UgKHNlZSBMSUNFTlNFLnR4dClcblx0ICovXG5cblx0Lypqc2xpbnQgYnJvd3Nlcjp0cnVlLCBub2RlOnRydWUqL1xuXHQvKmdsb2JhbCBkZWZpbmUsIEV2ZW50LCBOb2RlKi9cblxuXG5cdC8qKlxuXHQgKiBJbnN0YW50aWF0ZSBmYXN0LWNsaWNraW5nIGxpc3RlbmVycyBvbiB0aGUgc3BlY2lmaWVkIGxheWVyLlxuXHQgKlxuXHQgKiBAY29uc3RydWN0b3Jcblx0ICogQHBhcmFtIHtFbGVtZW50fSBsYXllciBUaGUgbGF5ZXIgdG8gbGlzdGVuIG9uXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gVGhlIG9wdGlvbnMgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzXG5cdCAqL1xuXHRmdW5jdGlvbiBGYXN0Q2xpY2sobGF5ZXIsIG9wdGlvbnMpIHtcblx0XHR2YXIgb2xkT25DbGljaztcblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0LyoqXG5cdFx0ICogV2hldGhlciBhIGNsaWNrIGlzIGN1cnJlbnRseSBiZWluZyB0cmFja2VkLlxuXHRcdCAqXG5cdFx0ICogQHR5cGUgYm9vbGVhblxuXHRcdCAqL1xuXHRcdHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xuXG5cblx0XHQvKipcblx0XHQgKiBUaW1lc3RhbXAgZm9yIHdoZW4gY2xpY2sgdHJhY2tpbmcgc3RhcnRlZC5cblx0XHQgKlxuXHRcdCAqIEB0eXBlIG51bWJlclxuXHRcdCAqL1xuXHRcdHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0ID0gMDtcblxuXG5cdFx0LyoqXG5cdFx0ICogVGhlIGVsZW1lbnQgYmVpbmcgdHJhY2tlZCBmb3IgYSBjbGljay5cblx0XHQgKlxuXHRcdCAqIEB0eXBlIEV2ZW50VGFyZ2V0XG5cdFx0ICovXG5cdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcblxuXG5cdFx0LyoqXG5cdFx0ICogWC1jb29yZGluYXRlIG9mIHRvdWNoIHN0YXJ0IGV2ZW50LlxuXHRcdCAqXG5cdFx0ICogQHR5cGUgbnVtYmVyXG5cdFx0ICovXG5cdFx0dGhpcy50b3VjaFN0YXJ0WCA9IDA7XG5cblxuXHRcdC8qKlxuXHRcdCAqIFktY29vcmRpbmF0ZSBvZiB0b3VjaCBzdGFydCBldmVudC5cblx0XHQgKlxuXHRcdCAqIEB0eXBlIG51bWJlclxuXHRcdCAqL1xuXHRcdHRoaXMudG91Y2hTdGFydFkgPSAwO1xuXG5cblx0XHQvKipcblx0XHQgKiBJRCBvZiB0aGUgbGFzdCB0b3VjaCwgcmV0cmlldmVkIGZyb20gVG91Y2guaWRlbnRpZmllci5cblx0XHQgKlxuXHRcdCAqIEB0eXBlIG51bWJlclxuXHRcdCAqL1xuXHRcdHRoaXMubGFzdFRvdWNoSWRlbnRpZmllciA9IDA7XG5cblxuXHRcdC8qKlxuXHRcdCAqIFRvdWNobW92ZSBib3VuZGFyeSwgYmV5b25kIHdoaWNoIGEgY2xpY2sgd2lsbCBiZSBjYW5jZWxsZWQuXG5cdFx0ICpcblx0XHQgKiBAdHlwZSBudW1iZXJcblx0XHQgKi9cblx0XHR0aGlzLnRvdWNoQm91bmRhcnkgPSBvcHRpb25zLnRvdWNoQm91bmRhcnkgfHwgMTA7XG5cblxuXHRcdC8qKlxuXHRcdCAqIFRoZSBGYXN0Q2xpY2sgbGF5ZXIuXG5cdFx0ICpcblx0XHQgKiBAdHlwZSBFbGVtZW50XG5cdFx0ICovXG5cdFx0dGhpcy5sYXllciA9IGxheWVyO1xuXG5cdFx0LyoqXG5cdFx0ICogVGhlIG1pbmltdW0gdGltZSBiZXR3ZWVuIHRhcCh0b3VjaHN0YXJ0IGFuZCB0b3VjaGVuZCkgZXZlbnRzXG5cdFx0ICpcblx0XHQgKiBAdHlwZSBudW1iZXJcblx0XHQgKi9cblx0XHR0aGlzLnRhcERlbGF5ID0gb3B0aW9ucy50YXBEZWxheSB8fCAyMDA7XG5cblx0XHQvKipcblx0XHQgKiBUaGUgbWF4aW11bSB0aW1lIGZvciBhIHRhcFxuXHRcdCAqXG5cdFx0ICogQHR5cGUgbnVtYmVyXG5cdFx0ICovXG5cdFx0dGhpcy50YXBUaW1lb3V0ID0gb3B0aW9ucy50YXBUaW1lb3V0IHx8IDcwMDtcblxuXHRcdGlmIChGYXN0Q2xpY2subm90TmVlZGVkKGxheWVyKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIFNvbWUgb2xkIHZlcnNpb25zIG9mIEFuZHJvaWQgZG9uJ3QgaGF2ZSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZFxuXHRcdGZ1bmN0aW9uIGJpbmQobWV0aG9kLCBjb250ZXh0KSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiBtZXRob2QuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTsgfTtcblx0XHR9XG5cblxuXHRcdHZhciBtZXRob2RzID0gWydvbk1vdXNlJywgJ29uQ2xpY2snLCAnb25Ub3VjaFN0YXJ0JywgJ29uVG91Y2hNb3ZlJywgJ29uVG91Y2hFbmQnLCAnb25Ub3VjaENhbmNlbCddO1xuXHRcdHZhciBjb250ZXh0ID0gdGhpcztcblx0XHRmb3IgKHZhciBpID0gMCwgbCA9IG1ldGhvZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRjb250ZXh0W21ldGhvZHNbaV1dID0gYmluZChjb250ZXh0W21ldGhvZHNbaV1dLCBjb250ZXh0KTtcblx0XHR9XG5cblx0XHQvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnMgYXMgcmVxdWlyZWRcblx0XHRpZiAoZGV2aWNlSXNBbmRyb2lkKSB7XG5cdFx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW92ZXInLCB0aGlzLm9uTW91c2UsIHRydWUpO1xuXHRcdFx0bGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5vbk1vdXNlLCB0cnVlKTtcblx0XHRcdGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLm9uTW91c2UsIHRydWUpO1xuXHRcdH1cblxuXHRcdGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5vbkNsaWNrLCB0cnVlKTtcblx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdGhpcy5vblRvdWNoU3RhcnQsIGZhbHNlKTtcblx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLm9uVG91Y2hNb3ZlLCBmYWxzZSk7XG5cdFx0bGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLm9uVG91Y2hFbmQsIGZhbHNlKTtcblx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGNhbmNlbCcsIHRoaXMub25Ub3VjaENhbmNlbCwgZmFsc2UpO1xuXG5cdFx0Ly8gSGFjayBpcyByZXF1aXJlZCBmb3IgYnJvd3NlcnMgdGhhdCBkb24ndCBzdXBwb3J0IEV2ZW50I3N0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiAoZS5nLiBBbmRyb2lkIDIpXG5cdFx0Ly8gd2hpY2ggaXMgaG93IEZhc3RDbGljayBub3JtYWxseSBzdG9wcyBjbGljayBldmVudHMgYnViYmxpbmcgdG8gY2FsbGJhY2tzIHJlZ2lzdGVyZWQgb24gdGhlIEZhc3RDbGlja1xuXHRcdC8vIGxheWVyIHdoZW4gdGhleSBhcmUgY2FuY2VsbGVkLlxuXHRcdGlmICghRXZlbnQucHJvdG90eXBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbikge1xuXHRcdFx0bGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGNhbGxiYWNrLCBjYXB0dXJlKSB7XG5cdFx0XHRcdHZhciBybXYgPSBOb2RlLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyO1xuXHRcdFx0XHRpZiAodHlwZSA9PT0gJ2NsaWNrJykge1xuXHRcdFx0XHRcdHJtdi5jYWxsKGxheWVyLCB0eXBlLCBjYWxsYmFjay5oaWphY2tlZCB8fCBjYWxsYmFjaywgY2FwdHVyZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cm12LmNhbGwobGF5ZXIsIHR5cGUsIGNhbGxiYWNrLCBjYXB0dXJlKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0bGF5ZXIuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGNhbGxiYWNrLCBjYXB0dXJlKSB7XG5cdFx0XHRcdHZhciBhZHYgPSBOb2RlLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyO1xuXHRcdFx0XHRpZiAodHlwZSA9PT0gJ2NsaWNrJykge1xuXHRcdFx0XHRcdGFkdi5jYWxsKGxheWVyLCB0eXBlLCBjYWxsYmFjay5oaWphY2tlZCB8fCAoY2FsbGJhY2suaGlqYWNrZWQgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0XHRcdFx0aWYgKCFldmVudC5wcm9wYWdhdGlvblN0b3BwZWQpIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2soZXZlbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pLCBjYXB0dXJlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhZHYuY2FsbChsYXllciwgdHlwZSwgY2FsbGJhY2ssIGNhcHR1cmUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8vIElmIGEgaGFuZGxlciBpcyBhbHJlYWR5IGRlY2xhcmVkIGluIHRoZSBlbGVtZW50J3Mgb25jbGljayBhdHRyaWJ1dGUsIGl0IHdpbGwgYmUgZmlyZWQgYmVmb3JlXG5cdFx0Ly8gRmFzdENsaWNrJ3Mgb25DbGljayBoYW5kbGVyLiBGaXggdGhpcyBieSBwdWxsaW5nIG91dCB0aGUgdXNlci1kZWZpbmVkIGhhbmRsZXIgZnVuY3Rpb24gYW5kXG5cdFx0Ly8gYWRkaW5nIGl0IGFzIGxpc3RlbmVyLlxuXHRcdGlmICh0eXBlb2YgbGF5ZXIub25jbGljayA9PT0gJ2Z1bmN0aW9uJykge1xuXG5cdFx0XHQvLyBBbmRyb2lkIGJyb3dzZXIgb24gYXQgbGVhc3QgMy4yIHJlcXVpcmVzIGEgbmV3IHJlZmVyZW5jZSB0byB0aGUgZnVuY3Rpb24gaW4gbGF5ZXIub25jbGlja1xuXHRcdFx0Ly8gLSB0aGUgb2xkIG9uZSB3b24ndCB3b3JrIGlmIHBhc3NlZCB0byBhZGRFdmVudExpc3RlbmVyIGRpcmVjdGx5LlxuXHRcdFx0b2xkT25DbGljayA9IGxheWVyLm9uY2xpY2s7XG5cdFx0XHRsYXllci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRcdG9sZE9uQ2xpY2soZXZlbnQpO1xuXHRcdFx0fSwgZmFsc2UpO1xuXHRcdFx0bGF5ZXIub25jbGljayA9IG51bGw7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCogV2luZG93cyBQaG9uZSA4LjEgZmFrZXMgdXNlciBhZ2VudCBzdHJpbmcgdG8gbG9vayBsaWtlIEFuZHJvaWQgYW5kIGlQaG9uZS5cblx0KlxuXHQqIEB0eXBlIGJvb2xlYW5cblx0Ki9cblx0dmFyIGRldmljZUlzV2luZG93c1Bob25lID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiV2luZG93cyBQaG9uZVwiKSA+PSAwO1xuXG5cdC8qKlxuXHQgKiBBbmRyb2lkIHJlcXVpcmVzIGV4Y2VwdGlvbnMuXG5cdCAqXG5cdCAqIEB0eXBlIGJvb2xlYW5cblx0ICovXG5cdHZhciBkZXZpY2VJc0FuZHJvaWQgPSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0FuZHJvaWQnKSA+IDAgJiYgIWRldmljZUlzV2luZG93c1Bob25lO1xuXG5cblx0LyoqXG5cdCAqIGlPUyByZXF1aXJlcyBleGNlcHRpb25zLlxuXHQgKlxuXHQgKiBAdHlwZSBib29sZWFuXG5cdCAqL1xuXHR2YXIgZGV2aWNlSXNJT1MgPSAvaVAoYWR8aG9uZXxvZCkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgJiYgIWRldmljZUlzV2luZG93c1Bob25lO1xuXG5cblx0LyoqXG5cdCAqIGlPUyA0IHJlcXVpcmVzIGFuIGV4Y2VwdGlvbiBmb3Igc2VsZWN0IGVsZW1lbnRzLlxuXHQgKlxuXHQgKiBAdHlwZSBib29sZWFuXG5cdCAqL1xuXHR2YXIgZGV2aWNlSXNJT1M0ID0gZGV2aWNlSXNJT1MgJiYgKC9PUyA0X1xcZChfXFxkKT8vKS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuXG5cblx0LyoqXG5cdCAqIGlPUyA2LjAtNy4qIHJlcXVpcmVzIHRoZSB0YXJnZXQgZWxlbWVudCB0byBiZSBtYW51YWxseSBkZXJpdmVkXG5cdCAqXG5cdCAqIEB0eXBlIGJvb2xlYW5cblx0ICovXG5cdHZhciBkZXZpY2VJc0lPU1dpdGhCYWRUYXJnZXQgPSBkZXZpY2VJc0lPUyAmJiAoL09TIFs2LTddX1xcZC8pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cblx0LyoqXG5cdCAqIEJsYWNrQmVycnkgcmVxdWlyZXMgZXhjZXB0aW9ucy5cblx0ICpcblx0ICogQHR5cGUgYm9vbGVhblxuXHQgKi9cblx0dmFyIGRldmljZUlzQmxhY2tCZXJyeTEwID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdCQjEwJykgPiAwO1xuXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgd2hldGhlciBhIGdpdmVuIGVsZW1lbnQgcmVxdWlyZXMgYSBuYXRpdmUgY2xpY2suXG5cdCAqXG5cdCAqIEBwYXJhbSB7RXZlbnRUYXJnZXR8RWxlbWVudH0gdGFyZ2V0IFRhcmdldCBET00gZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSBlbGVtZW50IG5lZWRzIGEgbmF0aXZlIGNsaWNrXG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLm5lZWRzQ2xpY2sgPSBmdW5jdGlvbih0YXJnZXQpIHtcblx0XHRzd2l0Y2ggKHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cblx0XHQvLyBEb24ndCBzZW5kIGEgc3ludGhldGljIGNsaWNrIHRvIGRpc2FibGVkIGlucHV0cyAoaXNzdWUgIzYyKVxuXHRcdGNhc2UgJ2J1dHRvbic6XG5cdFx0Y2FzZSAnc2VsZWN0Jzpcblx0XHRjYXNlICd0ZXh0YXJlYSc6XG5cdFx0XHRpZiAodGFyZ2V0LmRpc2FibGVkKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdpbnB1dCc6XG5cblx0XHRcdC8vIEZpbGUgaW5wdXRzIG5lZWQgcmVhbCBjbGlja3Mgb24gaU9TIDYgZHVlIHRvIGEgYnJvd3NlciBidWcgKGlzc3VlICM2OClcblx0XHRcdGlmICgoZGV2aWNlSXNJT1MgJiYgdGFyZ2V0LnR5cGUgPT09ICdmaWxlJykgfHwgdGFyZ2V0LmRpc2FibGVkKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdsYWJlbCc6XG5cdFx0Y2FzZSAnaWZyYW1lJzogLy8gaU9TOCBob21lc2NyZWVuIGFwcHMgY2FuIHByZXZlbnQgZXZlbnRzIGJ1YmJsaW5nIGludG8gZnJhbWVzXG5cdFx0Y2FzZSAndmlkZW8nOlxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuICgvXFxibmVlZHNjbGlja1xcYi8pLnRlc3QodGFyZ2V0LmNsYXNzTmFtZSk7XG5cdH07XG5cblxuXHQvKipcblx0ICogRGV0ZXJtaW5lIHdoZXRoZXIgYSBnaXZlbiBlbGVtZW50IHJlcXVpcmVzIGEgY2FsbCB0byBmb2N1cyB0byBzaW11bGF0ZSBjbGljayBpbnRvIGVsZW1lbnQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7RXZlbnRUYXJnZXR8RWxlbWVudH0gdGFyZ2V0IFRhcmdldCBET00gZWxlbWVudFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSBlbGVtZW50IHJlcXVpcmVzIGEgY2FsbCB0byBmb2N1cyB0byBzaW11bGF0ZSBuYXRpdmUgY2xpY2suXG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLm5lZWRzRm9jdXMgPSBmdW5jdGlvbih0YXJnZXQpIHtcblx0XHRzd2l0Y2ggKHRhcmdldC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cdFx0Y2FzZSAndGV4dGFyZWEnOlxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0Y2FzZSAnc2VsZWN0Jzpcblx0XHRcdHJldHVybiAhZGV2aWNlSXNBbmRyb2lkO1xuXHRcdGNhc2UgJ2lucHV0Jzpcblx0XHRcdHN3aXRjaCAodGFyZ2V0LnR5cGUpIHtcblx0XHRcdGNhc2UgJ2J1dHRvbic6XG5cdFx0XHRjYXNlICdjaGVja2JveCc6XG5cdFx0XHRjYXNlICdmaWxlJzpcblx0XHRcdGNhc2UgJ2ltYWdlJzpcblx0XHRcdGNhc2UgJ3JhZGlvJzpcblx0XHRcdGNhc2UgJ3N1Ym1pdCc6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTm8gcG9pbnQgaW4gYXR0ZW1wdGluZyB0byBmb2N1cyBkaXNhYmxlZCBpbnB1dHNcblx0XHRcdHJldHVybiAhdGFyZ2V0LmRpc2FibGVkICYmICF0YXJnZXQucmVhZE9ubHk7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiAoL1xcYm5lZWRzZm9jdXNcXGIvKS50ZXN0KHRhcmdldC5jbGFzc05hbWUpO1xuXHRcdH1cblx0fTtcblxuXG5cdC8qKlxuXHQgKiBTZW5kIGEgY2xpY2sgZXZlbnQgdG8gdGhlIHNwZWNpZmllZCBlbGVtZW50LlxuXHQgKlxuXHQgKiBAcGFyYW0ge0V2ZW50VGFyZ2V0fEVsZW1lbnR9IHRhcmdldEVsZW1lbnRcblx0ICogQHBhcmFtIHtFdmVudH0gZXZlbnRcblx0ICovXG5cdEZhc3RDbGljay5wcm90b3R5cGUuc2VuZENsaWNrID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnQpIHtcblx0XHR2YXIgY2xpY2tFdmVudCwgdG91Y2g7XG5cblx0XHQvLyBPbiBzb21lIEFuZHJvaWQgZGV2aWNlcyBhY3RpdmVFbGVtZW50IG5lZWRzIHRvIGJlIGJsdXJyZWQgb3RoZXJ3aXNlIHRoZSBzeW50aGV0aWMgY2xpY2sgd2lsbCBoYXZlIG5vIGVmZmVjdCAoIzI0KVxuXHRcdGlmIChkb2N1bWVudC5hY3RpdmVFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgIT09IHRhcmdldEVsZW1lbnQpIHtcblx0XHRcdGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuYmx1cigpO1xuXHRcdH1cblxuXHRcdHRvdWNoID0gZXZlbnQuY2hhbmdlZFRvdWNoZXNbMF07XG5cblx0XHQvLyBTeW50aGVzaXNlIGEgY2xpY2sgZXZlbnQsIHdpdGggYW4gZXh0cmEgYXR0cmlidXRlIHNvIGl0IGNhbiBiZSB0cmFja2VkXG5cdFx0Y2xpY2tFdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdNb3VzZUV2ZW50cycpO1xuXHRcdGNsaWNrRXZlbnQuaW5pdE1vdXNlRXZlbnQodGhpcy5kZXRlcm1pbmVFdmVudFR5cGUodGFyZ2V0RWxlbWVudCksIHRydWUsIHRydWUsIHdpbmRvdywgMSwgdG91Y2guc2NyZWVuWCwgdG91Y2guc2NyZWVuWSwgdG91Y2guY2xpZW50WCwgdG91Y2guY2xpZW50WSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDAsIG51bGwpO1xuXHRcdGNsaWNrRXZlbnQuZm9yd2FyZGVkVG91Y2hFdmVudCA9IHRydWU7XG5cdFx0dGFyZ2V0RWxlbWVudC5kaXNwYXRjaEV2ZW50KGNsaWNrRXZlbnQpO1xuXHR9O1xuXG5cdEZhc3RDbGljay5wcm90b3R5cGUuZGV0ZXJtaW5lRXZlbnRUeXBlID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCkge1xuXG5cdFx0Ly9Jc3N1ZSAjMTU5OiBBbmRyb2lkIENocm9tZSBTZWxlY3QgQm94IGRvZXMgbm90IG9wZW4gd2l0aCBhIHN5bnRoZXRpYyBjbGljayBldmVudFxuXHRcdGlmIChkZXZpY2VJc0FuZHJvaWQgJiYgdGFyZ2V0RWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzZWxlY3QnKSB7XG5cdFx0XHRyZXR1cm4gJ21vdXNlZG93bic7XG5cdFx0fVxuXG5cdFx0cmV0dXJuICdjbGljayc7XG5cdH07XG5cblxuXHQvKipcblx0ICogQHBhcmFtIHtFdmVudFRhcmdldHxFbGVtZW50fSB0YXJnZXRFbGVtZW50XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLmZvY3VzID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCkge1xuXHRcdHZhciBsZW5ndGg7XG5cblx0XHQvLyBJc3N1ZSAjMTYwOiBvbiBpT1MgNywgc29tZSBpbnB1dCBlbGVtZW50cyAoZS5nLiBkYXRlIGRhdGV0aW1lIG1vbnRoKSB0aHJvdyBhIHZhZ3VlIFR5cGVFcnJvciBvbiBzZXRTZWxlY3Rpb25SYW5nZS4gVGhlc2UgZWxlbWVudHMgZG9uJ3QgaGF2ZSBhbiBpbnRlZ2VyIHZhbHVlIGZvciB0aGUgc2VsZWN0aW9uU3RhcnQgYW5kIHNlbGVjdGlvbkVuZCBwcm9wZXJ0aWVzLCBidXQgdW5mb3J0dW5hdGVseSB0aGF0IGNhbid0IGJlIHVzZWQgZm9yIGRldGVjdGlvbiBiZWNhdXNlIGFjY2Vzc2luZyB0aGUgcHJvcGVydGllcyBhbHNvIHRocm93cyBhIFR5cGVFcnJvci4gSnVzdCBjaGVjayB0aGUgdHlwZSBpbnN0ZWFkLiBGaWxlZCBhcyBBcHBsZSBidWcgIzE1MTIyNzI0LlxuXHRcdGlmIChkZXZpY2VJc0lPUyAmJiB0YXJnZXRFbGVtZW50LnNldFNlbGVjdGlvblJhbmdlICYmIHRhcmdldEVsZW1lbnQudHlwZS5pbmRleE9mKCdkYXRlJykgIT09IDAgJiYgdGFyZ2V0RWxlbWVudC50eXBlICE9PSAndGltZScgJiYgdGFyZ2V0RWxlbWVudC50eXBlICE9PSAnbW9udGgnKSB7XG5cdFx0XHRsZW5ndGggPSB0YXJnZXRFbGVtZW50LnZhbHVlLmxlbmd0aDtcblx0XHRcdHRhcmdldEVsZW1lbnQuc2V0U2VsZWN0aW9uUmFuZ2UobGVuZ3RoLCBsZW5ndGgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0YXJnZXRFbGVtZW50LmZvY3VzKCk7XG5cdFx0fVxuXHR9O1xuXG5cblx0LyoqXG5cdCAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIHRhcmdldCBlbGVtZW50IGlzIGEgY2hpbGQgb2YgYSBzY3JvbGxhYmxlIGxheWVyIGFuZCBpZiBzbywgc2V0IGEgZmxhZyBvbiBpdC5cblx0ICpcblx0ICogQHBhcmFtIHtFdmVudFRhcmdldHxFbGVtZW50fSB0YXJnZXRFbGVtZW50XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLnVwZGF0ZVNjcm9sbFBhcmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQpIHtcblx0XHR2YXIgc2Nyb2xsUGFyZW50LCBwYXJlbnRFbGVtZW50O1xuXG5cdFx0c2Nyb2xsUGFyZW50ID0gdGFyZ2V0RWxlbWVudC5mYXN0Q2xpY2tTY3JvbGxQYXJlbnQ7XG5cblx0XHQvLyBBdHRlbXB0IHRvIGRpc2NvdmVyIHdoZXRoZXIgdGhlIHRhcmdldCBlbGVtZW50IGlzIGNvbnRhaW5lZCB3aXRoaW4gYSBzY3JvbGxhYmxlIGxheWVyLiBSZS1jaGVjayBpZiB0aGVcblx0XHQvLyB0YXJnZXQgZWxlbWVudCB3YXMgbW92ZWQgdG8gYW5vdGhlciBwYXJlbnQuXG5cdFx0aWYgKCFzY3JvbGxQYXJlbnQgfHwgIXNjcm9sbFBhcmVudC5jb250YWlucyh0YXJnZXRFbGVtZW50KSkge1xuXHRcdFx0cGFyZW50RWxlbWVudCA9IHRhcmdldEVsZW1lbnQ7XG5cdFx0XHRkbyB7XG5cdFx0XHRcdGlmIChwYXJlbnRFbGVtZW50LnNjcm9sbEhlaWdodCA+IHBhcmVudEVsZW1lbnQub2Zmc2V0SGVpZ2h0KSB7XG5cdFx0XHRcdFx0c2Nyb2xsUGFyZW50ID0gcGFyZW50RWxlbWVudDtcblx0XHRcdFx0XHR0YXJnZXRFbGVtZW50LmZhc3RDbGlja1Njcm9sbFBhcmVudCA9IHBhcmVudEVsZW1lbnQ7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRwYXJlbnRFbGVtZW50ID0gcGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50O1xuXHRcdFx0fSB3aGlsZSAocGFyZW50RWxlbWVudCk7XG5cdFx0fVxuXG5cdFx0Ly8gQWx3YXlzIHVwZGF0ZSB0aGUgc2Nyb2xsIHRvcCB0cmFja2VyIGlmIHBvc3NpYmxlLlxuXHRcdGlmIChzY3JvbGxQYXJlbnQpIHtcblx0XHRcdHNjcm9sbFBhcmVudC5mYXN0Q2xpY2tMYXN0U2Nyb2xsVG9wID0gc2Nyb2xsUGFyZW50LnNjcm9sbFRvcDtcblx0XHR9XG5cdH07XG5cblxuXHQvKipcblx0ICogQHBhcmFtIHtFdmVudFRhcmdldH0gdGFyZ2V0RWxlbWVudFxuXHQgKiBAcmV0dXJucyB7RWxlbWVudHxFdmVudFRhcmdldH1cblx0ICovXG5cdEZhc3RDbGljay5wcm90b3R5cGUuZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldCA9IGZ1bmN0aW9uKGV2ZW50VGFyZ2V0KSB7XG5cblx0XHQvLyBPbiBzb21lIG9sZGVyIGJyb3dzZXJzIChub3RhYmx5IFNhZmFyaSBvbiBpT1MgNC4xIC0gc2VlIGlzc3VlICM1NikgdGhlIGV2ZW50IHRhcmdldCBtYXkgYmUgYSB0ZXh0IG5vZGUuXG5cdFx0aWYgKGV2ZW50VGFyZ2V0Lm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuXHRcdFx0cmV0dXJuIGV2ZW50VGFyZ2V0LnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGV2ZW50VGFyZ2V0O1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIE9uIHRvdWNoIHN0YXJ0LCByZWNvcmQgdGhlIHBvc2l0aW9uIGFuZCBzY3JvbGwgb2Zmc2V0LlxuXHQgKlxuXHQgKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEZhc3RDbGljay5wcm90b3R5cGUub25Ub3VjaFN0YXJ0ID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR2YXIgdGFyZ2V0RWxlbWVudCwgdG91Y2gsIHNlbGVjdGlvbjtcblxuXHRcdC8vIElnbm9yZSBtdWx0aXBsZSB0b3VjaGVzLCBvdGhlcndpc2UgcGluY2gtdG8tem9vbSBpcyBwcmV2ZW50ZWQgaWYgYm90aCBmaW5nZXJzIGFyZSBvbiB0aGUgRmFzdENsaWNrIGVsZW1lbnQgKGlzc3VlICMxMTEpLlxuXHRcdGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHRhcmdldEVsZW1lbnQgPSB0aGlzLmdldFRhcmdldEVsZW1lbnRGcm9tRXZlbnRUYXJnZXQoZXZlbnQudGFyZ2V0KTtcblx0XHR0b3VjaCA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF07XG5cblx0XHRpZiAoZGV2aWNlSXNJT1MpIHtcblxuXHRcdFx0Ly8gT25seSB0cnVzdGVkIGV2ZW50cyB3aWxsIGRlc2VsZWN0IHRleHQgb24gaU9TIChpc3N1ZSAjNDkpXG5cdFx0XHRzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG5cdFx0XHRpZiAoc2VsZWN0aW9uLnJhbmdlQ291bnQgJiYgIXNlbGVjdGlvbi5pc0NvbGxhcHNlZCkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFkZXZpY2VJc0lPUzQpIHtcblxuXHRcdFx0XHQvLyBXZWlyZCB0aGluZ3MgaGFwcGVuIG9uIGlPUyB3aGVuIGFuIGFsZXJ0IG9yIGNvbmZpcm0gZGlhbG9nIGlzIG9wZW5lZCBmcm9tIGEgY2xpY2sgZXZlbnQgY2FsbGJhY2sgKGlzc3VlICMyMyk6XG5cdFx0XHRcdC8vIHdoZW4gdGhlIHVzZXIgbmV4dCB0YXBzIGFueXdoZXJlIGVsc2Ugb24gdGhlIHBhZ2UsIG5ldyB0b3VjaHN0YXJ0IGFuZCB0b3VjaGVuZCBldmVudHMgYXJlIGRpc3BhdGNoZWRcblx0XHRcdFx0Ly8gd2l0aCB0aGUgc2FtZSBpZGVudGlmaWVyIGFzIHRoZSB0b3VjaCBldmVudCB0aGF0IHByZXZpb3VzbHkgdHJpZ2dlcmVkIHRoZSBjbGljayB0aGF0IHRyaWdnZXJlZCB0aGUgYWxlcnQuXG5cdFx0XHRcdC8vIFNhZGx5LCB0aGVyZSBpcyBhbiBpc3N1ZSBvbiBpT1MgNCB0aGF0IGNhdXNlcyBzb21lIG5vcm1hbCB0b3VjaCBldmVudHMgdG8gaGF2ZSB0aGUgc2FtZSBpZGVudGlmaWVyIGFzIGFuXG5cdFx0XHRcdC8vIGltbWVkaWF0ZWx5IHByZWNlZWRpbmcgdG91Y2ggZXZlbnQgKGlzc3VlICM1MiksIHNvIHRoaXMgZml4IGlzIHVuYXZhaWxhYmxlIG9uIHRoYXQgcGxhdGZvcm0uXG5cdFx0XHRcdC8vIElzc3VlIDEyMDogdG91Y2guaWRlbnRpZmllciBpcyAwIHdoZW4gQ2hyb21lIGRldiB0b29scyAnRW11bGF0ZSB0b3VjaCBldmVudHMnIGlzIHNldCB3aXRoIGFuIGlPUyBkZXZpY2UgVUEgc3RyaW5nLFxuXHRcdFx0XHQvLyB3aGljaCBjYXVzZXMgYWxsIHRvdWNoIGV2ZW50cyB0byBiZSBpZ25vcmVkLiBBcyB0aGlzIGJsb2NrIG9ubHkgYXBwbGllcyB0byBpT1MsIGFuZCBpT1MgaWRlbnRpZmllcnMgYXJlIGFsd2F5cyBsb25nLFxuXHRcdFx0XHQvLyByYW5kb20gaW50ZWdlcnMsIGl0J3Mgc2FmZSB0byB0byBjb250aW51ZSBpZiB0aGUgaWRlbnRpZmllciBpcyAwIGhlcmUuXG5cdFx0XHRcdGlmICh0b3VjaC5pZGVudGlmaWVyICYmIHRvdWNoLmlkZW50aWZpZXIgPT09IHRoaXMubGFzdFRvdWNoSWRlbnRpZmllcikge1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy5sYXN0VG91Y2hJZGVudGlmaWVyID0gdG91Y2guaWRlbnRpZmllcjtcblxuXHRcdFx0XHQvLyBJZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaXMgYSBjaGlsZCBvZiBhIHNjcm9sbGFibGUgbGF5ZXIgKHVzaW5nIC13ZWJraXQtb3ZlcmZsb3ctc2Nyb2xsaW5nOiB0b3VjaCkgYW5kOlxuXHRcdFx0XHQvLyAxKSB0aGUgdXNlciBkb2VzIGEgZmxpbmcgc2Nyb2xsIG9uIHRoZSBzY3JvbGxhYmxlIGxheWVyXG5cdFx0XHRcdC8vIDIpIHRoZSB1c2VyIHN0b3BzIHRoZSBmbGluZyBzY3JvbGwgd2l0aCBhbm90aGVyIHRhcFxuXHRcdFx0XHQvLyB0aGVuIHRoZSBldmVudC50YXJnZXQgb2YgdGhlIGxhc3QgJ3RvdWNoZW5kJyBldmVudCB3aWxsIGJlIHRoZSBlbGVtZW50IHRoYXQgd2FzIHVuZGVyIHRoZSB1c2VyJ3MgZmluZ2VyXG5cdFx0XHRcdC8vIHdoZW4gdGhlIGZsaW5nIHNjcm9sbCB3YXMgc3RhcnRlZCwgY2F1c2luZyBGYXN0Q2xpY2sgdG8gc2VuZCBhIGNsaWNrIGV2ZW50IHRvIHRoYXQgbGF5ZXIgLSB1bmxlc3MgYSBjaGVja1xuXHRcdFx0XHQvLyBpcyBtYWRlIHRvIGVuc3VyZSB0aGF0IGEgcGFyZW50IGxheWVyIHdhcyBub3Qgc2Nyb2xsZWQgYmVmb3JlIHNlbmRpbmcgYSBzeW50aGV0aWMgY2xpY2sgKGlzc3VlICM0MikuXG5cdFx0XHRcdHRoaXMudXBkYXRlU2Nyb2xsUGFyZW50KHRhcmdldEVsZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMudHJhY2tpbmdDbGljayA9IHRydWU7XG5cdFx0dGhpcy50cmFja2luZ0NsaWNrU3RhcnQgPSBldmVudC50aW1lU3RhbXA7XG5cdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDtcblxuXHRcdHRoaXMudG91Y2hTdGFydFggPSB0b3VjaC5wYWdlWDtcblx0XHR0aGlzLnRvdWNoU3RhcnRZID0gdG91Y2gucGFnZVk7XG5cblx0XHQvLyBQcmV2ZW50IHBoYW50b20gY2xpY2tzIG9uIGZhc3QgZG91YmxlLXRhcCAoaXNzdWUgIzM2KVxuXHRcdGlmICgoZXZlbnQudGltZVN0YW1wIC0gdGhpcy5sYXN0Q2xpY2tUaW1lKSA8IHRoaXMudGFwRGVsYXkpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH07XG5cblxuXHQvKipcblx0ICogQmFzZWQgb24gYSB0b3VjaG1vdmUgZXZlbnQgb2JqZWN0LCBjaGVjayB3aGV0aGVyIHRoZSB0b3VjaCBoYXMgbW92ZWQgcGFzdCBhIGJvdW5kYXJ5IHNpbmNlIGl0IHN0YXJ0ZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0RmFzdENsaWNrLnByb3RvdHlwZS50b3VjaEhhc01vdmVkID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR2YXIgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXSwgYm91bmRhcnkgPSB0aGlzLnRvdWNoQm91bmRhcnk7XG5cblx0XHRpZiAoTWF0aC5hYnModG91Y2gucGFnZVggLSB0aGlzLnRvdWNoU3RhcnRYKSA+IGJvdW5kYXJ5IHx8IE1hdGguYWJzKHRvdWNoLnBhZ2VZIC0gdGhpcy50b3VjaFN0YXJ0WSkgPiBib3VuZGFyeSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIFVwZGF0ZSB0aGUgbGFzdCBwb3NpdGlvbi5cblx0ICpcblx0ICogQHBhcmFtIHtFdmVudH0gZXZlbnRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLm9uVG91Y2hNb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZiAoIXRoaXMudHJhY2tpbmdDbGljaykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgdGhlIHRvdWNoIGhhcyBtb3ZlZCwgY2FuY2VsIHRoZSBjbGljayB0cmFja2luZ1xuXHRcdGlmICh0aGlzLnRhcmdldEVsZW1lbnQgIT09IHRoaXMuZ2V0VGFyZ2V0RWxlbWVudEZyb21FdmVudFRhcmdldChldmVudC50YXJnZXQpIHx8IHRoaXMudG91Y2hIYXNNb3ZlZChldmVudCkpIHtcblx0XHRcdHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xuXHRcdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBBdHRlbXB0IHRvIGZpbmQgdGhlIGxhYmVsbGVkIGNvbnRyb2wgZm9yIHRoZSBnaXZlbiBsYWJlbCBlbGVtZW50LlxuXHQgKlxuXHQgKiBAcGFyYW0ge0V2ZW50VGFyZ2V0fEhUTUxMYWJlbEVsZW1lbnR9IGxhYmVsRWxlbWVudFxuXHQgKiBAcmV0dXJucyB7RWxlbWVudHxudWxsfVxuXHQgKi9cblx0RmFzdENsaWNrLnByb3RvdHlwZS5maW5kQ29udHJvbCA9IGZ1bmN0aW9uKGxhYmVsRWxlbWVudCkge1xuXG5cdFx0Ly8gRmFzdCBwYXRoIGZvciBuZXdlciBicm93c2VycyBzdXBwb3J0aW5nIHRoZSBIVE1MNSBjb250cm9sIGF0dHJpYnV0ZVxuXHRcdGlmIChsYWJlbEVsZW1lbnQuY29udHJvbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gbGFiZWxFbGVtZW50LmNvbnRyb2w7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsIGJyb3dzZXJzIHVuZGVyIHRlc3QgdGhhdCBzdXBwb3J0IHRvdWNoIGV2ZW50cyBhbHNvIHN1cHBvcnQgdGhlIEhUTUw1IGh0bWxGb3IgYXR0cmlidXRlXG5cdFx0aWYgKGxhYmVsRWxlbWVudC5odG1sRm9yKSB7XG5cdFx0XHRyZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobGFiZWxFbGVtZW50Lmh0bWxGb3IpO1xuXHRcdH1cblxuXHRcdC8vIElmIG5vIGZvciBhdHRyaWJ1dGUgZXhpc3RzLCBhdHRlbXB0IHRvIHJldHJpZXZlIHRoZSBmaXJzdCBsYWJlbGxhYmxlIGRlc2NlbmRhbnQgZWxlbWVudFxuXHRcdC8vIHRoZSBsaXN0IG9mIHdoaWNoIGlzIGRlZmluZWQgaGVyZTogaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDUvZm9ybXMuaHRtbCNjYXRlZ29yeS1sYWJlbFxuXHRcdHJldHVybiBsYWJlbEVsZW1lbnQucXVlcnlTZWxlY3RvcignYnV0dG9uLCBpbnB1dDpub3QoW3R5cGU9aGlkZGVuXSksIGtleWdlbiwgbWV0ZXIsIG91dHB1dCwgcHJvZ3Jlc3MsIHNlbGVjdCwgdGV4dGFyZWEnKTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBPbiB0b3VjaCBlbmQsIGRldGVybWluZSB3aGV0aGVyIHRvIHNlbmQgYSBjbGljayBldmVudCBhdCBvbmNlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdEZhc3RDbGljay5wcm90b3R5cGUub25Ub3VjaEVuZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0dmFyIGZvckVsZW1lbnQsIHRyYWNraW5nQ2xpY2tTdGFydCwgdGFyZ2V0VGFnTmFtZSwgc2Nyb2xsUGFyZW50LCB0b3VjaCwgdGFyZ2V0RWxlbWVudCA9IHRoaXMudGFyZ2V0RWxlbWVudDtcblxuXHRcdGlmICghdGhpcy50cmFja2luZ0NsaWNrKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBQcmV2ZW50IHBoYW50b20gY2xpY2tzIG9uIGZhc3QgZG91YmxlLXRhcCAoaXNzdWUgIzM2KVxuXHRcdGlmICgoZXZlbnQudGltZVN0YW1wIC0gdGhpcy5sYXN0Q2xpY2tUaW1lKSA8IHRoaXMudGFwRGVsYXkpIHtcblx0XHRcdHRoaXMuY2FuY2VsTmV4dENsaWNrID0gdHJ1ZTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICgoZXZlbnQudGltZVN0YW1wIC0gdGhpcy50cmFja2luZ0NsaWNrU3RhcnQpID4gdGhpcy50YXBUaW1lb3V0KSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBSZXNldCB0byBwcmV2ZW50IHdyb25nIGNsaWNrIGNhbmNlbCBvbiBpbnB1dCAoaXNzdWUgIzE1NikuXG5cdFx0dGhpcy5jYW5jZWxOZXh0Q2xpY2sgPSBmYWxzZTtcblxuXHRcdHRoaXMubGFzdENsaWNrVGltZSA9IGV2ZW50LnRpbWVTdGFtcDtcblxuXHRcdHRyYWNraW5nQ2xpY2tTdGFydCA9IHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0O1xuXHRcdHRoaXMudHJhY2tpbmdDbGljayA9IGZhbHNlO1xuXHRcdHRoaXMudHJhY2tpbmdDbGlja1N0YXJ0ID0gMDtcblxuXHRcdC8vIE9uIHNvbWUgaU9TIGRldmljZXMsIHRoZSB0YXJnZXRFbGVtZW50IHN1cHBsaWVkIHdpdGggdGhlIGV2ZW50IGlzIGludmFsaWQgaWYgdGhlIGxheWVyXG5cdFx0Ly8gaXMgcGVyZm9ybWluZyBhIHRyYW5zaXRpb24gb3Igc2Nyb2xsLCBhbmQgaGFzIHRvIGJlIHJlLWRldGVjdGVkIG1hbnVhbGx5LiBOb3RlIHRoYXRcblx0XHQvLyBmb3IgdGhpcyB0byBmdW5jdGlvbiBjb3JyZWN0bHksIGl0IG11c3QgYmUgY2FsbGVkICphZnRlciogdGhlIGV2ZW50IHRhcmdldCBpcyBjaGVja2VkIVxuXHRcdC8vIFNlZSBpc3N1ZSAjNTc7IGFsc28gZmlsZWQgYXMgcmRhcjovLzEzMDQ4NTg5IC5cblx0XHRpZiAoZGV2aWNlSXNJT1NXaXRoQmFkVGFyZ2V0KSB7XG5cdFx0XHR0b3VjaCA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdO1xuXG5cdFx0XHQvLyBJbiBjZXJ0YWluIGNhc2VzIGFyZ3VtZW50cyBvZiBlbGVtZW50RnJvbVBvaW50IGNhbiBiZSBuZWdhdGl2ZSwgc28gcHJldmVudCBzZXR0aW5nIHRhcmdldEVsZW1lbnQgdG8gbnVsbFxuXHRcdFx0dGFyZ2V0RWxlbWVudCA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQodG91Y2gucGFnZVggLSB3aW5kb3cucGFnZVhPZmZzZXQsIHRvdWNoLnBhZ2VZIC0gd2luZG93LnBhZ2VZT2Zmc2V0KSB8fCB0YXJnZXRFbGVtZW50O1xuXHRcdFx0dGFyZ2V0RWxlbWVudC5mYXN0Q2xpY2tTY3JvbGxQYXJlbnQgPSB0aGlzLnRhcmdldEVsZW1lbnQuZmFzdENsaWNrU2Nyb2xsUGFyZW50O1xuXHRcdH1cblxuXHRcdHRhcmdldFRhZ05hbWUgPSB0YXJnZXRFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAodGFyZ2V0VGFnTmFtZSA9PT0gJ2xhYmVsJykge1xuXHRcdFx0Zm9yRWxlbWVudCA9IHRoaXMuZmluZENvbnRyb2wodGFyZ2V0RWxlbWVudCk7XG5cdFx0XHRpZiAoZm9yRWxlbWVudCkge1xuXHRcdFx0XHR0aGlzLmZvY3VzKHRhcmdldEVsZW1lbnQpO1xuXHRcdFx0XHRpZiAoZGV2aWNlSXNBbmRyb2lkKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGFyZ2V0RWxlbWVudCA9IGZvckVsZW1lbnQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0aGlzLm5lZWRzRm9jdXModGFyZ2V0RWxlbWVudCkpIHtcblxuXHRcdFx0Ly8gQ2FzZSAxOiBJZiB0aGUgdG91Y2ggc3RhcnRlZCBhIHdoaWxlIGFnbyAoYmVzdCBndWVzcyBpcyAxMDBtcyBiYXNlZCBvbiB0ZXN0cyBmb3IgaXNzdWUgIzM2KSB0aGVuIGZvY3VzIHdpbGwgYmUgdHJpZ2dlcmVkIGFueXdheS4gUmV0dXJuIGVhcmx5IGFuZCB1bnNldCB0aGUgdGFyZ2V0IGVsZW1lbnQgcmVmZXJlbmNlIHNvIHRoYXQgdGhlIHN1YnNlcXVlbnQgY2xpY2sgd2lsbCBiZSBhbGxvd2VkIHRocm91Z2guXG5cdFx0XHQvLyBDYXNlIDI6IFdpdGhvdXQgdGhpcyBleGNlcHRpb24gZm9yIGlucHV0IGVsZW1lbnRzIHRhcHBlZCB3aGVuIHRoZSBkb2N1bWVudCBpcyBjb250YWluZWQgaW4gYW4gaWZyYW1lLCB0aGVuIGFueSBpbnB1dHRlZCB0ZXh0IHdvbid0IGJlIHZpc2libGUgZXZlbiB0aG91Z2ggdGhlIHZhbHVlIGF0dHJpYnV0ZSBpcyB1cGRhdGVkIGFzIHRoZSB1c2VyIHR5cGVzIChpc3N1ZSAjMzcpLlxuXHRcdFx0aWYgKChldmVudC50aW1lU3RhbXAgLSB0cmFja2luZ0NsaWNrU3RhcnQpID4gMTAwIHx8IChkZXZpY2VJc0lPUyAmJiB3aW5kb3cudG9wICE9PSB3aW5kb3cgJiYgdGFyZ2V0VGFnTmFtZSA9PT0gJ2lucHV0JykpIHtcblx0XHRcdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmZvY3VzKHRhcmdldEVsZW1lbnQpO1xuXHRcdFx0dGhpcy5zZW5kQ2xpY2sodGFyZ2V0RWxlbWVudCwgZXZlbnQpO1xuXG5cdFx0XHQvLyBTZWxlY3QgZWxlbWVudHMgbmVlZCB0aGUgZXZlbnQgdG8gZ28gdGhyb3VnaCBvbiBpT1MgNCwgb3RoZXJ3aXNlIHRoZSBzZWxlY3RvciBtZW51IHdvbid0IG9wZW4uXG5cdFx0XHQvLyBBbHNvIHRoaXMgYnJlYWtzIG9wZW5pbmcgc2VsZWN0cyB3aGVuIFZvaWNlT3ZlciBpcyBhY3RpdmUgb24gaU9TNiwgaU9TNyAoYW5kIHBvc3NpYmx5IG90aGVycylcblx0XHRcdGlmICghZGV2aWNlSXNJT1MgfHwgdGFyZ2V0VGFnTmFtZSAhPT0gJ3NlbGVjdCcpIHtcblx0XHRcdFx0dGhpcy50YXJnZXRFbGVtZW50ID0gbnVsbDtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGlmIChkZXZpY2VJc0lPUyAmJiAhZGV2aWNlSXNJT1M0KSB7XG5cblx0XHRcdC8vIERvbid0IHNlbmQgYSBzeW50aGV0aWMgY2xpY2sgZXZlbnQgaWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGNvbnRhaW5lZCB3aXRoaW4gYSBwYXJlbnQgbGF5ZXIgdGhhdCB3YXMgc2Nyb2xsZWRcblx0XHRcdC8vIGFuZCB0aGlzIHRhcCBpcyBiZWluZyB1c2VkIHRvIHN0b3AgdGhlIHNjcm9sbGluZyAodXN1YWxseSBpbml0aWF0ZWQgYnkgYSBmbGluZyAtIGlzc3VlICM0MikuXG5cdFx0XHRzY3JvbGxQYXJlbnQgPSB0YXJnZXRFbGVtZW50LmZhc3RDbGlja1Njcm9sbFBhcmVudDtcblx0XHRcdGlmIChzY3JvbGxQYXJlbnQgJiYgc2Nyb2xsUGFyZW50LmZhc3RDbGlja0xhc3RTY3JvbGxUb3AgIT09IHNjcm9sbFBhcmVudC5zY3JvbGxUb3ApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gUHJldmVudCB0aGUgYWN0dWFsIGNsaWNrIGZyb20gZ29pbmcgdGhvdWdoIC0gdW5sZXNzIHRoZSB0YXJnZXQgbm9kZSBpcyBtYXJrZWQgYXMgcmVxdWlyaW5nXG5cdFx0Ly8gcmVhbCBjbGlja3Mgb3IgaWYgaXQgaXMgaW4gdGhlIHdoaXRlbGlzdCBpbiB3aGljaCBjYXNlIG9ubHkgbm9uLXByb2dyYW1tYXRpYyBjbGlja3MgYXJlIHBlcm1pdHRlZC5cblx0XHRpZiAoIXRoaXMubmVlZHNDbGljayh0YXJnZXRFbGVtZW50KSkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMuc2VuZENsaWNrKHRhcmdldEVsZW1lbnQsIGV2ZW50KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH07XG5cblxuXHQvKipcblx0ICogT24gdG91Y2ggY2FuY2VsLCBzdG9wIHRyYWNraW5nIHRoZSBjbGljay5cblx0ICpcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLm9uVG91Y2hDYW5jZWwgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnRyYWNraW5nQ2xpY2sgPSBmYWxzZTtcblx0XHR0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIERldGVybWluZSBtb3VzZSBldmVudHMgd2hpY2ggc2hvdWxkIGJlIHBlcm1pdHRlZC5cblx0ICpcblx0ICogQHBhcmFtIHtFdmVudH0gZXZlbnRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLm9uTW91c2UgPSBmdW5jdGlvbihldmVudCkge1xuXG5cdFx0Ly8gSWYgYSB0YXJnZXQgZWxlbWVudCB3YXMgbmV2ZXIgc2V0IChiZWNhdXNlIGEgdG91Y2ggZXZlbnQgd2FzIG5ldmVyIGZpcmVkKSBhbGxvdyB0aGUgZXZlbnRcblx0XHRpZiAoIXRoaXMudGFyZ2V0RWxlbWVudCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKGV2ZW50LmZvcndhcmRlZFRvdWNoRXZlbnQpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFByb2dyYW1tYXRpY2FsbHkgZ2VuZXJhdGVkIGV2ZW50cyB0YXJnZXRpbmcgYSBzcGVjaWZpYyBlbGVtZW50IHNob3VsZCBiZSBwZXJtaXR0ZWRcblx0XHRpZiAoIWV2ZW50LmNhbmNlbGFibGUpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIERlcml2ZSBhbmQgY2hlY2sgdGhlIHRhcmdldCBlbGVtZW50IHRvIHNlZSB3aGV0aGVyIHRoZSBtb3VzZSBldmVudCBuZWVkcyB0byBiZSBwZXJtaXR0ZWQ7XG5cdFx0Ly8gdW5sZXNzIGV4cGxpY2l0bHkgZW5hYmxlZCwgcHJldmVudCBub24tdG91Y2ggY2xpY2sgZXZlbnRzIGZyb20gdHJpZ2dlcmluZyBhY3Rpb25zLFxuXHRcdC8vIHRvIHByZXZlbnQgZ2hvc3QvZG91YmxlY2xpY2tzLlxuXHRcdGlmICghdGhpcy5uZWVkc0NsaWNrKHRoaXMudGFyZ2V0RWxlbWVudCkgfHwgdGhpcy5jYW5jZWxOZXh0Q2xpY2spIHtcblxuXHRcdFx0Ly8gUHJldmVudCBhbnkgdXNlci1hZGRlZCBsaXN0ZW5lcnMgZGVjbGFyZWQgb24gRmFzdENsaWNrIGVsZW1lbnQgZnJvbSBiZWluZyBmaXJlZC5cblx0XHRcdGlmIChldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24pIHtcblx0XHRcdFx0ZXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdC8vIFBhcnQgb2YgdGhlIGhhY2sgZm9yIGJyb3dzZXJzIHRoYXQgZG9uJ3Qgc3VwcG9ydCBFdmVudCNzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24gKGUuZy4gQW5kcm9pZCAyKVxuXHRcdFx0XHRldmVudC5wcm9wYWdhdGlvblN0b3BwZWQgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDYW5jZWwgdGhlIGV2ZW50XG5cdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBJZiB0aGUgbW91c2UgZXZlbnQgaXMgcGVybWl0dGVkLCByZXR1cm4gdHJ1ZSBmb3IgdGhlIGFjdGlvbiB0byBnbyB0aHJvdWdoLlxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXG5cblx0LyoqXG5cdCAqIE9uIGFjdHVhbCBjbGlja3MsIGRldGVybWluZSB3aGV0aGVyIHRoaXMgaXMgYSB0b3VjaC1nZW5lcmF0ZWQgY2xpY2ssIGEgY2xpY2sgYWN0aW9uIG9jY3VycmluZ1xuXHQgKiBuYXR1cmFsbHkgYWZ0ZXIgYSBkZWxheSBhZnRlciBhIHRvdWNoICh3aGljaCBuZWVkcyB0byBiZSBjYW5jZWxsZWQgdG8gYXZvaWQgZHVwbGljYXRpb24pLCBvclxuXHQgKiBhbiBhY3R1YWwgY2xpY2sgd2hpY2ggc2hvdWxkIGJlIHBlcm1pdHRlZC5cblx0ICpcblx0ICogQHBhcmFtIHtFdmVudH0gZXZlbnRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLm9uQ2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdHZhciBwZXJtaXR0ZWQ7XG5cblx0XHQvLyBJdCdzIHBvc3NpYmxlIGZvciBhbm90aGVyIEZhc3RDbGljay1saWtlIGxpYnJhcnkgZGVsaXZlcmVkIHdpdGggdGhpcmQtcGFydHkgY29kZSB0byBmaXJlIGEgY2xpY2sgZXZlbnQgYmVmb3JlIEZhc3RDbGljayBkb2VzIChpc3N1ZSAjNDQpLiBJbiB0aGF0IGNhc2UsIHNldCB0aGUgY2xpY2stdHJhY2tpbmcgZmxhZyBiYWNrIHRvIGZhbHNlIGFuZCByZXR1cm4gZWFybHkuIFRoaXMgd2lsbCBjYXVzZSBvblRvdWNoRW5kIHRvIHJldHVybiBlYXJseS5cblx0XHRpZiAodGhpcy50cmFja2luZ0NsaWNrKSB7XG5cdFx0XHR0aGlzLnRhcmdldEVsZW1lbnQgPSBudWxsO1xuXHRcdFx0dGhpcy50cmFja2luZ0NsaWNrID0gZmFsc2U7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBWZXJ5IG9kZCBiZWhhdmlvdXIgb24gaU9TIChpc3N1ZSAjMTgpOiBpZiBhIHN1Ym1pdCBlbGVtZW50IGlzIHByZXNlbnQgaW5zaWRlIGEgZm9ybSBhbmQgdGhlIHVzZXIgaGl0cyBlbnRlciBpbiB0aGUgaU9TIHNpbXVsYXRvciBvciBjbGlja3MgdGhlIEdvIGJ1dHRvbiBvbiB0aGUgcG9wLXVwIE9TIGtleWJvYXJkIHRoZSBhIGtpbmQgb2YgJ2Zha2UnIGNsaWNrIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkIHdpdGggdGhlIHN1Ym1pdC10eXBlIGlucHV0IGVsZW1lbnQgYXMgdGhlIHRhcmdldC5cblx0XHRpZiAoZXZlbnQudGFyZ2V0LnR5cGUgPT09ICdzdWJtaXQnICYmIGV2ZW50LmRldGFpbCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0cGVybWl0dGVkID0gdGhpcy5vbk1vdXNlKGV2ZW50KTtcblxuXHRcdC8vIE9ubHkgdW5zZXQgdGFyZ2V0RWxlbWVudCBpZiB0aGUgY2xpY2sgaXMgbm90IHBlcm1pdHRlZC4gVGhpcyB3aWxsIGVuc3VyZSB0aGF0IHRoZSBjaGVjayBmb3IgIXRhcmdldEVsZW1lbnQgaW4gb25Nb3VzZSBmYWlscyBhbmQgdGhlIGJyb3dzZXIncyBjbGljayBkb2Vzbid0IGdvIHRocm91Z2guXG5cdFx0aWYgKCFwZXJtaXR0ZWQpIHtcblx0XHRcdHRoaXMudGFyZ2V0RWxlbWVudCA9IG51bGw7XG5cdFx0fVxuXG5cdFx0Ly8gSWYgY2xpY2tzIGFyZSBwZXJtaXR0ZWQsIHJldHVybiB0cnVlIGZvciB0aGUgYWN0aW9uIHRvIGdvIHRocm91Z2guXG5cdFx0cmV0dXJuIHBlcm1pdHRlZDtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBSZW1vdmUgYWxsIEZhc3RDbGljaydzIGV2ZW50IGxpc3RlbmVycy5cblx0ICpcblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqL1xuXHRGYXN0Q2xpY2sucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGF5ZXIgPSB0aGlzLmxheWVyO1xuXG5cdFx0aWYgKGRldmljZUlzQW5kcm9pZCkge1xuXHRcdFx0bGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2VvdmVyJywgdGhpcy5vbk1vdXNlLCB0cnVlKTtcblx0XHRcdGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMub25Nb3VzZSwgdHJ1ZSk7XG5cdFx0XHRsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5vbk1vdXNlLCB0cnVlKTtcblx0XHR9XG5cblx0XHRsYXllci5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMub25DbGljaywgdHJ1ZSk7XG5cdFx0bGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRoaXMub25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG5cdFx0bGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5vblRvdWNoTW92ZSwgZmFsc2UpO1xuXHRcdGxheWVyLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5vblRvdWNoRW5kLCBmYWxzZSk7XG5cdFx0bGF5ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hjYW5jZWwnLCB0aGlzLm9uVG91Y2hDYW5jZWwsIGZhbHNlKTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIEZhc3RDbGljayBpcyBuZWVkZWQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7RWxlbWVudH0gbGF5ZXIgVGhlIGxheWVyIHRvIGxpc3RlbiBvblxuXHQgKi9cblx0RmFzdENsaWNrLm5vdE5lZWRlZCA9IGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0dmFyIG1ldGFWaWV3cG9ydDtcblx0XHR2YXIgY2hyb21lVmVyc2lvbjtcblx0XHR2YXIgYmxhY2tiZXJyeVZlcnNpb247XG5cdFx0dmFyIGZpcmVmb3hWZXJzaW9uO1xuXG5cdFx0Ly8gRGV2aWNlcyB0aGF0IGRvbid0IHN1cHBvcnQgdG91Y2ggZG9uJ3QgbmVlZCBGYXN0Q2xpY2tcblx0XHRpZiAodHlwZW9mIHdpbmRvdy5vbnRvdWNoc3RhcnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyBDaHJvbWUgdmVyc2lvbiAtIHplcm8gZm9yIG90aGVyIGJyb3dzZXJzXG5cdFx0Y2hyb21lVmVyc2lvbiA9ICsoL0Nocm9tZVxcLyhbMC05XSspLy5leGVjKG5hdmlnYXRvci51c2VyQWdlbnQpIHx8IFssMF0pWzFdO1xuXG5cdFx0aWYgKGNocm9tZVZlcnNpb24pIHtcblxuXHRcdFx0aWYgKGRldmljZUlzQW5kcm9pZCkge1xuXHRcdFx0XHRtZXRhVmlld3BvcnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9dmlld3BvcnRdJyk7XG5cblx0XHRcdFx0aWYgKG1ldGFWaWV3cG9ydCkge1xuXHRcdFx0XHRcdC8vIENocm9tZSBvbiBBbmRyb2lkIHdpdGggdXNlci1zY2FsYWJsZT1cIm5vXCIgZG9lc24ndCBuZWVkIEZhc3RDbGljayAoaXNzdWUgIzg5KVxuXHRcdFx0XHRcdGlmIChtZXRhVmlld3BvcnQuY29udGVudC5pbmRleE9mKCd1c2VyLXNjYWxhYmxlPW5vJykgIT09IC0xKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gQ2hyb21lIDMyIGFuZCBhYm92ZSB3aXRoIHdpZHRoPWRldmljZS13aWR0aCBvciBsZXNzIGRvbid0IG5lZWQgRmFzdENsaWNrXG5cdFx0XHRcdFx0aWYgKGNocm9tZVZlcnNpb24gPiAzMSAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsV2lkdGggPD0gd2luZG93Lm91dGVyV2lkdGgpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHQvLyBDaHJvbWUgZGVza3RvcCBkb2Vzbid0IG5lZWQgRmFzdENsaWNrIChpc3N1ZSAjMTUpXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZGV2aWNlSXNCbGFja0JlcnJ5MTApIHtcblx0XHRcdGJsYWNrYmVycnlWZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVmVyc2lvblxcLyhbMC05XSopXFwuKFswLTldKikvKTtcblxuXHRcdFx0Ly8gQmxhY2tCZXJyeSAxMC4zKyBkb2VzIG5vdCByZXF1aXJlIEZhc3RjbGljayBsaWJyYXJ5LlxuXHRcdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2Z0bGFicy9mYXN0Y2xpY2svaXNzdWVzLzI1MVxuXHRcdFx0aWYgKGJsYWNrYmVycnlWZXJzaW9uWzFdID49IDEwICYmIGJsYWNrYmVycnlWZXJzaW9uWzJdID49IDMpIHtcblx0XHRcdFx0bWV0YVZpZXdwb3J0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignbWV0YVtuYW1lPXZpZXdwb3J0XScpO1xuXG5cdFx0XHRcdGlmIChtZXRhVmlld3BvcnQpIHtcblx0XHRcdFx0XHQvLyB1c2VyLXNjYWxhYmxlPW5vIGVsaW1pbmF0ZXMgY2xpY2sgZGVsYXkuXG5cdFx0XHRcdFx0aWYgKG1ldGFWaWV3cG9ydC5jb250ZW50LmluZGV4T2YoJ3VzZXItc2NhbGFibGU9bm8nKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyB3aWR0aD1kZXZpY2Utd2lkdGggKG9yIGxlc3MgdGhhbiBkZXZpY2Utd2lkdGgpIGVsaW1pbmF0ZXMgY2xpY2sgZGVsYXkuXG5cdFx0XHRcdFx0aWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxXaWR0aCA8PSB3aW5kb3cub3V0ZXJXaWR0aCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSUUxMCB3aXRoIC1tcy10b3VjaC1hY3Rpb246IG5vbmUgb3IgbWFuaXB1bGF0aW9uLCB3aGljaCBkaXNhYmxlcyBkb3VibGUtdGFwLXRvLXpvb20gKGlzc3VlICM5Nylcblx0XHRpZiAobGF5ZXIuc3R5bGUubXNUb3VjaEFjdGlvbiA9PT0gJ25vbmUnIHx8IGxheWVyLnN0eWxlLnRvdWNoQWN0aW9uID09PSAnbWFuaXB1bGF0aW9uJykge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gRmlyZWZveCB2ZXJzaW9uIC0gemVybyBmb3Igb3RoZXIgYnJvd3NlcnNcblx0XHRmaXJlZm94VmVyc2lvbiA9ICsoL0ZpcmVmb3hcXC8oWzAtOV0rKS8uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSB8fCBbLDBdKVsxXTtcblxuXHRcdGlmIChmaXJlZm94VmVyc2lvbiA+PSAyNykge1xuXHRcdFx0Ly8gRmlyZWZveCAyNysgZG9lcyBub3QgaGF2ZSB0YXAgZGVsYXkgaWYgdGhlIGNvbnRlbnQgaXMgbm90IHpvb21hYmxlIC0gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9OTIyODk2XG5cblx0XHRcdG1ldGFWaWV3cG9ydCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT12aWV3cG9ydF0nKTtcblx0XHRcdGlmIChtZXRhVmlld3BvcnQgJiYgKG1ldGFWaWV3cG9ydC5jb250ZW50LmluZGV4T2YoJ3VzZXItc2NhbGFibGU9bm8nKSAhPT0gLTEgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoIDw9IHdpbmRvdy5vdXRlcldpZHRoKSkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBJRTExOiBwcmVmaXhlZCAtbXMtdG91Y2gtYWN0aW9uIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQgYW5kIGl0J3MgcmVjb21lbmRlZCB0byB1c2Ugbm9uLXByZWZpeGVkIHZlcnNpb25cblx0XHQvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvd2luZG93cy9hcHBzL0hoNzY3MzEzLmFzcHhcblx0XHRpZiAobGF5ZXIuc3R5bGUudG91Y2hBY3Rpb24gPT09ICdub25lJyB8fCBsYXllci5zdHlsZS50b3VjaEFjdGlvbiA9PT0gJ21hbmlwdWxhdGlvbicpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblxuXG5cdC8qKlxuXHQgKiBGYWN0b3J5IG1ldGhvZCBmb3IgY3JlYXRpbmcgYSBGYXN0Q2xpY2sgb2JqZWN0XG5cdCAqXG5cdCAqIEBwYXJhbSB7RWxlbWVudH0gbGF5ZXIgVGhlIGxheWVyIHRvIGxpc3RlbiBvblxuXHQgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0c1xuXHQgKi9cblx0RmFzdENsaWNrLmF0dGFjaCA9IGZ1bmN0aW9uKGxheWVyLCBvcHRpb25zKSB7XG5cdFx0cmV0dXJuIG5ldyBGYXN0Q2xpY2sobGF5ZXIsIG9wdGlvbnMpO1xuXHR9O1xuXG5cblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT09ICdvYmplY3QnICYmIGRlZmluZS5hbWQpIHtcblxuXHRcdC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gRmFzdENsaWNrO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBGYXN0Q2xpY2suYXR0YWNoO1xuXHRcdG1vZHVsZS5leHBvcnRzLkZhc3RDbGljayA9IEZhc3RDbGljaztcblx0fSBlbHNlIHtcblx0XHR3aW5kb3cuRmFzdENsaWNrID0gRmFzdENsaWNrO1xuXHR9XG59KCkpO1xuIiwidmFyIFZOb2RlID0gcmVxdWlyZSgnLi92bm9kZScpO1xudmFyIGlzID0gcmVxdWlyZSgnLi9pcycpO1xuXG5mdW5jdGlvbiBhZGROUyhkYXRhLCBjaGlsZHJlbiwgc2VsKSB7XG4gIGRhdGEubnMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuXG4gIGlmIChzZWwgIT09ICdmb3JlaWduT2JqZWN0JyAmJiBjaGlsZHJlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgYWRkTlMoY2hpbGRyZW5baV0uZGF0YSwgY2hpbGRyZW5baV0uY2hpbGRyZW4sIGNoaWxkcmVuW2ldLnNlbCk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaChzZWwsIGIsIGMpIHtcbiAgdmFyIGRhdGEgPSB7fSwgY2hpbGRyZW4sIHRleHQsIGk7XG4gIGlmIChjICE9PSB1bmRlZmluZWQpIHtcbiAgICBkYXRhID0gYjtcbiAgICBpZiAoaXMuYXJyYXkoYykpIHsgY2hpbGRyZW4gPSBjOyB9XG4gICAgZWxzZSBpZiAoaXMucHJpbWl0aXZlKGMpKSB7IHRleHQgPSBjOyB9XG4gIH0gZWxzZSBpZiAoYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzLmFycmF5KGIpKSB7IGNoaWxkcmVuID0gYjsgfVxuICAgIGVsc2UgaWYgKGlzLnByaW1pdGl2ZShiKSkgeyB0ZXh0ID0gYjsgfVxuICAgIGVsc2UgeyBkYXRhID0gYjsgfVxuICB9XG4gIGlmIChpcy5hcnJheShjaGlsZHJlbikpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChpcy5wcmltaXRpdmUoY2hpbGRyZW5baV0pKSBjaGlsZHJlbltpXSA9IFZOb2RlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIGNoaWxkcmVuW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKHNlbFswXSA9PT0gJ3MnICYmIHNlbFsxXSA9PT0gJ3YnICYmIHNlbFsyXSA9PT0gJ2cnKSB7XG4gICAgYWRkTlMoZGF0YSwgY2hpbGRyZW4sIHNlbCk7XG4gIH1cbiAgcmV0dXJuIFZOb2RlKHNlbCwgZGF0YSwgY2hpbGRyZW4sIHRleHQsIHVuZGVmaW5lZCk7XG59O1xuIiwiZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh0YWdOYW1lKXtcbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnROUyhuYW1lc3BhY2VVUkksIHF1YWxpZmllZE5hbWUpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5hbWVzcGFjZVVSSSwgcXVhbGlmaWVkTmFtZSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRleHROb2RlKHRleHQpe1xuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dCk7XG59XG5cblxuZnVuY3Rpb24gaW5zZXJ0QmVmb3JlKHBhcmVudE5vZGUsIG5ld05vZGUsIHJlZmVyZW5jZU5vZGUpe1xuICBwYXJlbnROb2RlLmluc2VydEJlZm9yZShuZXdOb2RlLCByZWZlcmVuY2VOb2RlKTtcbn1cblxuXG5mdW5jdGlvbiByZW1vdmVDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUucmVtb3ZlQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBhcHBlbmRDaGlsZChub2RlLCBjaGlsZCl7XG4gIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGQpO1xufVxuXG5mdW5jdGlvbiBwYXJlbnROb2RlKG5vZGUpe1xuICByZXR1cm4gbm9kZS5wYXJlbnRFbGVtZW50O1xufVxuXG5mdW5jdGlvbiBuZXh0U2libGluZyhub2RlKXtcbiAgcmV0dXJuIG5vZGUubmV4dFNpYmxpbmc7XG59XG5cbmZ1bmN0aW9uIHRhZ05hbWUobm9kZSl7XG4gIHJldHVybiBub2RlLnRhZ05hbWU7XG59XG5cbmZ1bmN0aW9uIHNldFRleHRDb250ZW50KG5vZGUsIHRleHQpe1xuICBub2RlLnRleHRDb250ZW50ID0gdGV4dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUVsZW1lbnQ6IGNyZWF0ZUVsZW1lbnQsXG4gIGNyZWF0ZUVsZW1lbnROUzogY3JlYXRlRWxlbWVudE5TLFxuICBjcmVhdGVUZXh0Tm9kZTogY3JlYXRlVGV4dE5vZGUsXG4gIGFwcGVuZENoaWxkOiBhcHBlbmRDaGlsZCxcbiAgcmVtb3ZlQ2hpbGQ6IHJlbW92ZUNoaWxkLFxuICBpbnNlcnRCZWZvcmU6IGluc2VydEJlZm9yZSxcbiAgcGFyZW50Tm9kZTogcGFyZW50Tm9kZSxcbiAgbmV4dFNpYmxpbmc6IG5leHRTaWJsaW5nLFxuICB0YWdOYW1lOiB0YWdOYW1lLFxuICBzZXRUZXh0Q29udGVudDogc2V0VGV4dENvbnRlbnRcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYXJyYXk6IEFycmF5LmlzQXJyYXksXG4gIHByaW1pdGl2ZTogZnVuY3Rpb24ocykgeyByZXR1cm4gdHlwZW9mIHMgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBzID09PSAnbnVtYmVyJzsgfSxcbn07XG4iLCJ2YXIgTmFtZXNwYWNlVVJJcyA9IHtcbiAgXCJ4bGlua1wiOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIlxufTtcblxudmFyIGJvb2xlYW5BdHRycyA9IFtcImFsbG93ZnVsbHNjcmVlblwiLCBcImFzeW5jXCIsIFwiYXV0b2ZvY3VzXCIsIFwiYXV0b3BsYXlcIiwgXCJjaGVja2VkXCIsIFwiY29tcGFjdFwiLCBcImNvbnRyb2xzXCIsIFwiZGVjbGFyZVwiLFxuICAgICAgICAgICAgICAgIFwiZGVmYXVsdFwiLCBcImRlZmF1bHRjaGVja2VkXCIsIFwiZGVmYXVsdG11dGVkXCIsIFwiZGVmYXVsdHNlbGVjdGVkXCIsIFwiZGVmZXJcIiwgXCJkaXNhYmxlZFwiLCBcImRyYWdnYWJsZVwiLFxuICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiLCBcImZvcm1ub3ZhbGlkYXRlXCIsIFwiaGlkZGVuXCIsIFwiaW5kZXRlcm1pbmF0ZVwiLCBcImluZXJ0XCIsIFwiaXNtYXBcIiwgXCJpdGVtc2NvcGVcIiwgXCJsb29wXCIsIFwibXVsdGlwbGVcIixcbiAgICAgICAgICAgICAgICBcIm11dGVkXCIsIFwibm9ocmVmXCIsIFwibm9yZXNpemVcIiwgXCJub3NoYWRlXCIsIFwibm92YWxpZGF0ZVwiLCBcIm5vd3JhcFwiLCBcIm9wZW5cIiwgXCJwYXVzZW9uZXhpdFwiLCBcInJlYWRvbmx5XCIsXG4gICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiLCBcInJldmVyc2VkXCIsIFwic2NvcGVkXCIsIFwic2VhbWxlc3NcIiwgXCJzZWxlY3RlZFwiLCBcInNvcnRhYmxlXCIsIFwic3BlbGxjaGVja1wiLCBcInRyYW5zbGF0ZVwiLFxuICAgICAgICAgICAgICAgIFwidHJ1ZXNwZWVkXCIsIFwidHlwZW11c3RtYXRjaFwiLCBcInZpc2libGVcIl07XG5cbnZhciBib29sZWFuQXR0cnNEaWN0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbmZvcih2YXIgaT0wLCBsZW4gPSBib29sZWFuQXR0cnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgYm9vbGVhbkF0dHJzRGljdFtib29sZWFuQXR0cnNbaV1dID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQXR0cnMob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBrZXksIGN1ciwgb2xkLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRBdHRycyA9IG9sZFZub2RlLmRhdGEuYXR0cnMsIGF0dHJzID0gdm5vZGUuZGF0YS5hdHRycywgbmFtZXNwYWNlU3BsaXQ7XG5cbiAgaWYgKCFvbGRBdHRycyAmJiAhYXR0cnMpIHJldHVybjtcbiAgb2xkQXR0cnMgPSBvbGRBdHRycyB8fCB7fTtcbiAgYXR0cnMgPSBhdHRycyB8fCB7fTtcblxuICAvLyB1cGRhdGUgbW9kaWZpZWQgYXR0cmlidXRlcywgYWRkIG5ldyBhdHRyaWJ1dGVzXG4gIGZvciAoa2V5IGluIGF0dHJzKSB7XG4gICAgY3VyID0gYXR0cnNba2V5XTtcbiAgICBvbGQgPSBvbGRBdHRyc1trZXldO1xuICAgIGlmIChvbGQgIT09IGN1cikge1xuICAgICAgaWYoIWN1ciAmJiBib29sZWFuQXR0cnNEaWN0W2tleV0pXG4gICAgICAgIGVsbS5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgIGVsc2Uge1xuICAgICAgICBuYW1lc3BhY2VTcGxpdCA9IGtleS5zcGxpdChcIjpcIik7XG4gICAgICAgIGlmKG5hbWVzcGFjZVNwbGl0Lmxlbmd0aCA+IDEgJiYgTmFtZXNwYWNlVVJJcy5oYXNPd25Qcm9wZXJ0eShuYW1lc3BhY2VTcGxpdFswXSkpXG4gICAgICAgICAgZWxtLnNldEF0dHJpYnV0ZU5TKE5hbWVzcGFjZVVSSXNbbmFtZXNwYWNlU3BsaXRbMF1dLCBrZXksIGN1cik7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlKGtleSwgY3VyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy9yZW1vdmUgcmVtb3ZlZCBhdHRyaWJ1dGVzXG4gIC8vIHVzZSBgaW5gIG9wZXJhdG9yIHNpbmNlIHRoZSBwcmV2aW91cyBgZm9yYCBpdGVyYXRpb24gdXNlcyBpdCAoLmkuZS4gYWRkIGV2ZW4gYXR0cmlidXRlcyB3aXRoIHVuZGVmaW5lZCB2YWx1ZSlcbiAgLy8gdGhlIG90aGVyIG9wdGlvbiBpcyB0byByZW1vdmUgYWxsIGF0dHJpYnV0ZXMgd2l0aCB2YWx1ZSA9PSB1bmRlZmluZWRcbiAgZm9yIChrZXkgaW4gb2xkQXR0cnMpIHtcbiAgICBpZiAoIShrZXkgaW4gYXR0cnMpKSB7XG4gICAgICBlbG0ucmVtb3ZlQXR0cmlidXRlKGtleSk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlQXR0cnMsIHVwZGF0ZTogdXBkYXRlQXR0cnN9O1xuIiwiZnVuY3Rpb24gdXBkYXRlQ2xhc3Mob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZENsYXNzID0gb2xkVm5vZGUuZGF0YS5jbGFzcyxcbiAgICAgIGtsYXNzID0gdm5vZGUuZGF0YS5jbGFzcztcblxuICBpZiAoIW9sZENsYXNzICYmICFrbGFzcykgcmV0dXJuO1xuICBvbGRDbGFzcyA9IG9sZENsYXNzIHx8IHt9O1xuICBrbGFzcyA9IGtsYXNzIHx8IHt9O1xuXG4gIGZvciAobmFtZSBpbiBvbGRDbGFzcykge1xuICAgIGlmICgha2xhc3NbbmFtZV0pIHtcbiAgICAgIGVsbS5jbGFzc0xpc3QucmVtb3ZlKG5hbWUpO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4ga2xhc3MpIHtcbiAgICBjdXIgPSBrbGFzc1tuYW1lXTtcbiAgICBpZiAoY3VyICE9PSBvbGRDbGFzc1tuYW1lXSkge1xuICAgICAgZWxtLmNsYXNzTGlzdFtjdXIgPyAnYWRkJyA6ICdyZW1vdmUnXShuYW1lKTtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVDbGFzcywgdXBkYXRlOiB1cGRhdGVDbGFzc307XG4iLCJmdW5jdGlvbiBpbnZva2VIYW5kbGVyKGhhbmRsZXIsIHZub2RlLCBldmVudCkge1xuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIGNhbGwgZnVuY3Rpb24gaGFuZGxlclxuICAgIGhhbmRsZXIuY2FsbCh2bm9kZSwgZXZlbnQsIHZub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJvYmplY3RcIikge1xuICAgIC8vIGNhbGwgaGFuZGxlciB3aXRoIGFyZ3VtZW50c1xuICAgIGlmICh0eXBlb2YgaGFuZGxlclswXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBzcGVjaWFsIGNhc2UgZm9yIHNpbmdsZSBhcmd1bWVudCBmb3IgcGVyZm9ybWFuY2VcbiAgICAgIGlmIChoYW5kbGVyLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBoYW5kbGVyWzBdLmNhbGwodm5vZGUsIGhhbmRsZXJbMV0sIGV2ZW50LCB2bm9kZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IGhhbmRsZXIuc2xpY2UoMSk7XG4gICAgICAgIGFyZ3MucHVzaChldmVudCk7XG4gICAgICAgIGFyZ3MucHVzaCh2bm9kZSk7XG4gICAgICAgIGhhbmRsZXJbMF0uYXBwbHkodm5vZGUsIGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYWxsIG11bHRpcGxlIGhhbmRsZXJzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhbmRsZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaW52b2tlSGFuZGxlcihoYW5kbGVyW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZlbnQsIHZub2RlKSB7XG4gIHZhciBuYW1lID0gZXZlbnQudHlwZSxcbiAgICAgIG9uID0gdm5vZGUuZGF0YS5vbjtcblxuICAvLyBjYWxsIGV2ZW50IGhhbmRsZXIocykgaWYgZXhpc3RzXG4gIGlmIChvbiAmJiBvbltuYW1lXSkge1xuICAgIGludm9rZUhhbmRsZXIob25bbmFtZV0sIHZub2RlLCBldmVudCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTGlzdGVuZXIoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVyKGV2ZW50KSB7XG4gICAgaGFuZGxlRXZlbnQoZXZlbnQsIGhhbmRsZXIudm5vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUV2ZW50TGlzdGVuZXJzKG9sZFZub2RlLCB2bm9kZSkge1xuICB2YXIgb2xkT24gPSBvbGRWbm9kZS5kYXRhLm9uLFxuICAgICAgb2xkTGlzdGVuZXIgPSBvbGRWbm9kZS5saXN0ZW5lcixcbiAgICAgIG9sZEVsbSA9IG9sZFZub2RlLmVsbSxcbiAgICAgIG9uID0gdm5vZGUgJiYgdm5vZGUuZGF0YS5vbixcbiAgICAgIGVsbSA9IHZub2RlICYmIHZub2RlLmVsbSxcbiAgICAgIG5hbWU7XG5cbiAgLy8gb3B0aW1pemF0aW9uIGZvciByZXVzZWQgaW1tdXRhYmxlIGhhbmRsZXJzXG4gIGlmIChvbGRPbiA9PT0gb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyByZW1vdmUgZXhpc3RpbmcgbGlzdGVuZXJzIHdoaWNoIG5vIGxvbmdlciB1c2VkXG4gIGlmIChvbGRPbiAmJiBvbGRMaXN0ZW5lcikge1xuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBkZWxldGVkIHdlIHJlbW92ZSBhbGwgZXhpc3RpbmcgbGlzdGVuZXJzIHVuY29uZGl0aW9uYWxseVxuICAgIGlmICghb24pIHtcbiAgICAgIGZvciAobmFtZSBpbiBvbGRPbikge1xuICAgICAgICAvLyByZW1vdmUgbGlzdGVuZXIgaWYgZWxlbWVudCB3YXMgY2hhbmdlZCBvciBleGlzdGluZyBsaXN0ZW5lcnMgcmVtb3ZlZFxuICAgICAgICBvbGRFbG0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBvbGRMaXN0ZW5lciwgZmFsc2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKG5hbWUgaW4gb2xkT24pIHtcbiAgICAgICAgLy8gcmVtb3ZlIGxpc3RlbmVyIGlmIGV4aXN0aW5nIGxpc3RlbmVyIHJlbW92ZWRcbiAgICAgICAgaWYgKCFvbltuYW1lXSkge1xuICAgICAgICAgIG9sZEVsbS5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWUsIG9sZExpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBhZGQgbmV3IGxpc3RlbmVycyB3aGljaCBoYXMgbm90IGFscmVhZHkgYXR0YWNoZWRcbiAgaWYgKG9uKSB7XG4gICAgLy8gcmV1c2UgZXhpc3RpbmcgbGlzdGVuZXIgb3IgY3JlYXRlIG5ld1xuICAgIHZhciBsaXN0ZW5lciA9IHZub2RlLmxpc3RlbmVyID0gb2xkVm5vZGUubGlzdGVuZXIgfHwgY3JlYXRlTGlzdGVuZXIoKTtcbiAgICAvLyB1cGRhdGUgdm5vZGUgZm9yIGxpc3RlbmVyXG4gICAgbGlzdGVuZXIudm5vZGUgPSB2bm9kZTtcblxuICAgIC8vIGlmIGVsZW1lbnQgY2hhbmdlZCBvciBhZGRlZCB3ZSBhZGQgYWxsIG5lZWRlZCBsaXN0ZW5lcnMgdW5jb25kaXRpb25hbGx5XG4gICAgaWYgKCFvbGRPbikge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBlbGVtZW50IHdhcyBjaGFuZ2VkIG9yIG5ldyBsaXN0ZW5lcnMgYWRkZWRcbiAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChuYW1lIGluIG9uKSB7XG4gICAgICAgIC8vIGFkZCBsaXN0ZW5lciBpZiBuZXcgbGlzdGVuZXIgYWRkZWRcbiAgICAgICAgaWYgKCFvbGRPbltuYW1lXSkge1xuICAgICAgICAgIGVsbS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIHVwZGF0ZTogdXBkYXRlRXZlbnRMaXN0ZW5lcnMsXG4gIGRlc3Ryb3k6IHVwZGF0ZUV2ZW50TGlzdGVuZXJzXG59O1xuIiwiZnVuY3Rpb24gdXBkYXRlUHJvcHMob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBrZXksIGN1ciwgb2xkLCBlbG0gPSB2bm9kZS5lbG0sXG4gICAgICBvbGRQcm9wcyA9IG9sZFZub2RlLmRhdGEucHJvcHMsIHByb3BzID0gdm5vZGUuZGF0YS5wcm9wcztcblxuICBpZiAoIW9sZFByb3BzICYmICFwcm9wcykgcmV0dXJuO1xuICBvbGRQcm9wcyA9IG9sZFByb3BzIHx8IHt9O1xuICBwcm9wcyA9IHByb3BzIHx8IHt9O1xuXG4gIGZvciAoa2V5IGluIG9sZFByb3BzKSB7XG4gICAgaWYgKCFwcm9wc1trZXldKSB7XG4gICAgICBkZWxldGUgZWxtW2tleV07XG4gICAgfVxuICB9XG4gIGZvciAoa2V5IGluIHByb3BzKSB7XG4gICAgY3VyID0gcHJvcHNba2V5XTtcbiAgICBvbGQgPSBvbGRQcm9wc1trZXldO1xuICAgIGlmIChvbGQgIT09IGN1ciAmJiAoa2V5ICE9PSAndmFsdWUnIHx8IGVsbVtrZXldICE9PSBjdXIpKSB7XG4gICAgICBlbG1ba2V5XSA9IGN1cjtcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y3JlYXRlOiB1cGRhdGVQcm9wcywgdXBkYXRlOiB1cGRhdGVQcm9wc307XG4iLCJ2YXIgcmFmID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHx8IHNldFRpbWVvdXQ7XG52YXIgbmV4dEZyYW1lID0gZnVuY3Rpb24oZm4pIHsgcmFmKGZ1bmN0aW9uKCkgeyByYWYoZm4pOyB9KTsgfTtcblxuZnVuY3Rpb24gc2V0TmV4dEZyYW1lKG9iaiwgcHJvcCwgdmFsKSB7XG4gIG5leHRGcmFtZShmdW5jdGlvbigpIHsgb2JqW3Byb3BdID0gdmFsOyB9KTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3R5bGUob2xkVm5vZGUsIHZub2RlKSB7XG4gIHZhciBjdXIsIG5hbWUsIGVsbSA9IHZub2RlLmVsbSxcbiAgICAgIG9sZFN0eWxlID0gb2xkVm5vZGUuZGF0YS5zdHlsZSxcbiAgICAgIHN0eWxlID0gdm5vZGUuZGF0YS5zdHlsZTtcblxuICBpZiAoIW9sZFN0eWxlICYmICFzdHlsZSkgcmV0dXJuO1xuICBvbGRTdHlsZSA9IG9sZFN0eWxlIHx8IHt9O1xuICBzdHlsZSA9IHN0eWxlIHx8IHt9O1xuICB2YXIgb2xkSGFzRGVsID0gJ2RlbGF5ZWQnIGluIG9sZFN0eWxlO1xuXG4gIGZvciAobmFtZSBpbiBvbGRTdHlsZSkge1xuICAgIGlmICghc3R5bGVbbmFtZV0pIHtcbiAgICAgIGVsbS5zdHlsZVtuYW1lXSA9ICcnO1xuICAgIH1cbiAgfVxuICBmb3IgKG5hbWUgaW4gc3R5bGUpIHtcbiAgICBjdXIgPSBzdHlsZVtuYW1lXTtcbiAgICBpZiAobmFtZSA9PT0gJ2RlbGF5ZWQnKSB7XG4gICAgICBmb3IgKG5hbWUgaW4gc3R5bGUuZGVsYXllZCkge1xuICAgICAgICBjdXIgPSBzdHlsZS5kZWxheWVkW25hbWVdO1xuICAgICAgICBpZiAoIW9sZEhhc0RlbCB8fCBjdXIgIT09IG9sZFN0eWxlLmRlbGF5ZWRbbmFtZV0pIHtcbiAgICAgICAgICBzZXROZXh0RnJhbWUoZWxtLnN0eWxlLCBuYW1lLCBjdXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChuYW1lICE9PSAncmVtb3ZlJyAmJiBjdXIgIT09IG9sZFN0eWxlW25hbWVdKSB7XG4gICAgICBlbG0uc3R5bGVbbmFtZV0gPSBjdXI7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGx5RGVzdHJveVN0eWxlKHZub2RlKSB7XG4gIHZhciBzdHlsZSwgbmFtZSwgZWxtID0gdm5vZGUuZWxtLCBzID0gdm5vZGUuZGF0YS5zdHlsZTtcbiAgaWYgKCFzIHx8ICEoc3R5bGUgPSBzLmRlc3Ryb3kpKSByZXR1cm47XG4gIGZvciAobmFtZSBpbiBzdHlsZSkge1xuICAgIGVsbS5zdHlsZVtuYW1lXSA9IHN0eWxlW25hbWVdO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGx5UmVtb3ZlU3R5bGUodm5vZGUsIHJtKSB7XG4gIHZhciBzID0gdm5vZGUuZGF0YS5zdHlsZTtcbiAgaWYgKCFzIHx8ICFzLnJlbW92ZSkge1xuICAgIHJtKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBuYW1lLCBlbG0gPSB2bm9kZS5lbG0sIGlkeCwgaSA9IDAsIG1heER1ciA9IDAsXG4gICAgICBjb21wU3R5bGUsIHN0eWxlID0gcy5yZW1vdmUsIGFtb3VudCA9IDAsIGFwcGxpZWQgPSBbXTtcbiAgZm9yIChuYW1lIGluIHN0eWxlKSB7XG4gICAgYXBwbGllZC5wdXNoKG5hbWUpO1xuICAgIGVsbS5zdHlsZVtuYW1lXSA9IHN0eWxlW25hbWVdO1xuICB9XG4gIGNvbXBTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWxtKTtcbiAgdmFyIHByb3BzID0gY29tcFN0eWxlWyd0cmFuc2l0aW9uLXByb3BlcnR5J10uc3BsaXQoJywgJyk7XG4gIGZvciAoOyBpIDwgcHJvcHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZihhcHBsaWVkLmluZGV4T2YocHJvcHNbaV0pICE9PSAtMSkgYW1vdW50Kys7XG4gIH1cbiAgZWxtLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBmdW5jdGlvbihldikge1xuICAgIGlmIChldi50YXJnZXQgPT09IGVsbSkgLS1hbW91bnQ7XG4gICAgaWYgKGFtb3VudCA9PT0gMCkgcm0oKTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NyZWF0ZTogdXBkYXRlU3R5bGUsIHVwZGF0ZTogdXBkYXRlU3R5bGUsIGRlc3Ryb3k6IGFwcGx5RGVzdHJveVN0eWxlLCByZW1vdmU6IGFwcGx5UmVtb3ZlU3R5bGV9O1xuIiwiLy8ganNoaW50IG5ld2NhcDogZmFsc2Vcbi8qIGdsb2JhbCByZXF1aXJlLCBtb2R1bGUsIGRvY3VtZW50LCBOb2RlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBWTm9kZSA9IHJlcXVpcmUoJy4vdm5vZGUnKTtcbnZhciBpcyA9IHJlcXVpcmUoJy4vaXMnKTtcbnZhciBkb21BcGkgPSByZXF1aXJlKCcuL2h0bWxkb21hcGknKTtcblxuZnVuY3Rpb24gaXNVbmRlZihzKSB7IHJldHVybiBzID09PSB1bmRlZmluZWQ7IH1cbmZ1bmN0aW9uIGlzRGVmKHMpIHsgcmV0dXJuIHMgIT09IHVuZGVmaW5lZDsgfVxuXG52YXIgZW1wdHlOb2RlID0gVk5vZGUoJycsIHt9LCBbXSwgdW5kZWZpbmVkLCB1bmRlZmluZWQpO1xuXG5mdW5jdGlvbiBzYW1lVm5vZGUodm5vZGUxLCB2bm9kZTIpIHtcbiAgcmV0dXJuIHZub2RlMS5rZXkgPT09IHZub2RlMi5rZXkgJiYgdm5vZGUxLnNlbCA9PT0gdm5vZGUyLnNlbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlS2V5VG9PbGRJZHgoY2hpbGRyZW4sIGJlZ2luSWR4LCBlbmRJZHgpIHtcbiAgdmFyIGksIG1hcCA9IHt9LCBrZXk7XG4gIGZvciAoaSA9IGJlZ2luSWR4OyBpIDw9IGVuZElkeDsgKytpKSB7XG4gICAga2V5ID0gY2hpbGRyZW5baV0ua2V5O1xuICAgIGlmIChpc0RlZihrZXkpKSBtYXBba2V5XSA9IGk7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn1cblxudmFyIGhvb2tzID0gWydjcmVhdGUnLCAndXBkYXRlJywgJ3JlbW92ZScsICdkZXN0cm95JywgJ3ByZScsICdwb3N0J107XG5cbmZ1bmN0aW9uIGluaXQobW9kdWxlcywgYXBpKSB7XG4gIHZhciBpLCBqLCBjYnMgPSB7fTtcblxuICBpZiAoaXNVbmRlZihhcGkpKSBhcGkgPSBkb21BcGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IGhvb2tzLmxlbmd0aDsgKytpKSB7XG4gICAgY2JzW2hvb2tzW2ldXSA9IFtdO1xuICAgIGZvciAoaiA9IDA7IGogPCBtb2R1bGVzLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZiAobW9kdWxlc1tqXVtob29rc1tpXV0gIT09IHVuZGVmaW5lZCkgY2JzW2hvb2tzW2ldXS5wdXNoKG1vZHVsZXNbal1baG9va3NbaV1dKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlbXB0eU5vZGVBdChlbG0pIHtcbiAgICB2YXIgaWQgPSBlbG0uaWQgPyAnIycgKyBlbG0uaWQgOiAnJztcbiAgICB2YXIgYyA9IGVsbS5jbGFzc05hbWUgPyAnLicgKyBlbG0uY2xhc3NOYW1lLnNwbGl0KCcgJykuam9pbignLicpIDogJyc7XG4gICAgcmV0dXJuIFZOb2RlKGFwaS50YWdOYW1lKGVsbSkudG9Mb3dlckNhc2UoKSArIGlkICsgYywge30sIFtdLCB1bmRlZmluZWQsIGVsbSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVSbUNiKGNoaWxkRWxtLCBsaXN0ZW5lcnMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS1saXN0ZW5lcnMgPT09IDApIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IGFwaS5wYXJlbnROb2RlKGNoaWxkRWxtKTtcbiAgICAgICAgYXBpLnJlbW92ZUNoaWxkKHBhcmVudCwgY2hpbGRFbG0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVFbG0odm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSkge1xuICAgIHZhciBpLCBkYXRhID0gdm5vZGUuZGF0YTtcbiAgICBpZiAoaXNEZWYoZGF0YSkpIHtcbiAgICAgIGlmIChpc0RlZihpID0gZGF0YS5ob29rKSAmJiBpc0RlZihpID0gaS5pbml0KSkge1xuICAgICAgICBpKHZub2RlKTtcbiAgICAgICAgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBlbG0sIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW4sIHNlbCA9IHZub2RlLnNlbDtcbiAgICBpZiAoaXNEZWYoc2VsKSkge1xuICAgICAgLy8gUGFyc2Ugc2VsZWN0b3JcbiAgICAgIHZhciBoYXNoSWR4ID0gc2VsLmluZGV4T2YoJyMnKTtcbiAgICAgIHZhciBkb3RJZHggPSBzZWwuaW5kZXhPZignLicsIGhhc2hJZHgpO1xuICAgICAgdmFyIGhhc2ggPSBoYXNoSWR4ID4gMCA/IGhhc2hJZHggOiBzZWwubGVuZ3RoO1xuICAgICAgdmFyIGRvdCA9IGRvdElkeCA+IDAgPyBkb3RJZHggOiBzZWwubGVuZ3RoO1xuICAgICAgdmFyIHRhZyA9IGhhc2hJZHggIT09IC0xIHx8IGRvdElkeCAhPT0gLTEgPyBzZWwuc2xpY2UoMCwgTWF0aC5taW4oaGFzaCwgZG90KSkgOiBzZWw7XG4gICAgICBlbG0gPSB2bm9kZS5lbG0gPSBpc0RlZihkYXRhKSAmJiBpc0RlZihpID0gZGF0YS5ucykgPyBhcGkuY3JlYXRlRWxlbWVudE5TKGksIHRhZylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGFwaS5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgICBpZiAoaGFzaCA8IGRvdCkgZWxtLmlkID0gc2VsLnNsaWNlKGhhc2ggKyAxLCBkb3QpO1xuICAgICAgaWYgKGRvdElkeCA+IDApIGVsbS5jbGFzc05hbWUgPSBzZWwuc2xpY2UoZG90ICsgMSkucmVwbGFjZSgvXFwuL2csICcgJyk7XG4gICAgICBpZiAoaXMuYXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGFwaS5hcHBlbmRDaGlsZChlbG0sIGNyZWF0ZUVsbShjaGlsZHJlbltpXSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXMucHJpbWl0aXZlKHZub2RlLnRleHQpKSB7XG4gICAgICAgIGFwaS5hcHBlbmRDaGlsZChlbG0sIGFwaS5jcmVhdGVUZXh0Tm9kZSh2bm9kZS50ZXh0KSk7XG4gICAgICB9XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLmNyZWF0ZS5sZW5ndGg7ICsraSkgY2JzLmNyZWF0ZVtpXShlbXB0eU5vZGUsIHZub2RlKTtcbiAgICAgIGkgPSB2bm9kZS5kYXRhLmhvb2s7IC8vIFJldXNlIHZhcmlhYmxlXG4gICAgICBpZiAoaXNEZWYoaSkpIHtcbiAgICAgICAgaWYgKGkuY3JlYXRlKSBpLmNyZWF0ZShlbXB0eU5vZGUsIHZub2RlKTtcbiAgICAgICAgaWYgKGkuaW5zZXJ0KSBpbnNlcnRlZFZub2RlUXVldWUucHVzaCh2bm9kZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsbSA9IHZub2RlLmVsbSA9IGFwaS5jcmVhdGVUZXh0Tm9kZSh2bm9kZS50ZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuIHZub2RlLmVsbTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFZub2RlcyhwYXJlbnRFbG0sIGJlZm9yZSwgdm5vZGVzLCBzdGFydElkeCwgZW5kSWR4LCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICBmb3IgKDsgc3RhcnRJZHggPD0gZW5kSWR4OyArK3N0YXJ0SWR4KSB7XG4gICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgY3JlYXRlRWxtKHZub2Rlc1tzdGFydElkeF0sIGluc2VydGVkVm5vZGVRdWV1ZSksIGJlZm9yZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW52b2tlRGVzdHJveUhvb2sodm5vZGUpIHtcbiAgICB2YXIgaSwgaiwgZGF0YSA9IHZub2RlLmRhdGE7XG4gICAgaWYgKGlzRGVmKGRhdGEpKSB7XG4gICAgICBpZiAoaXNEZWYoaSA9IGRhdGEuaG9vaykgJiYgaXNEZWYoaSA9IGkuZGVzdHJveSkpIGkodm5vZGUpO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy5kZXN0cm95Lmxlbmd0aDsgKytpKSBjYnMuZGVzdHJveVtpXSh2bm9kZSk7XG4gICAgICBpZiAoaXNEZWYoaSA9IHZub2RlLmNoaWxkcmVuKSkge1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgdm5vZGUuY2hpbGRyZW4ubGVuZ3RoOyArK2opIHtcbiAgICAgICAgICBpbnZva2VEZXN0cm95SG9vayh2bm9kZS5jaGlsZHJlbltqXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVWbm9kZXMocGFyZW50RWxtLCB2bm9kZXMsIHN0YXJ0SWR4LCBlbmRJZHgpIHtcbiAgICBmb3IgKDsgc3RhcnRJZHggPD0gZW5kSWR4OyArK3N0YXJ0SWR4KSB7XG4gICAgICB2YXIgaSwgbGlzdGVuZXJzLCBybSwgY2ggPSB2bm9kZXNbc3RhcnRJZHhdO1xuICAgICAgaWYgKGlzRGVmKGNoKSkge1xuICAgICAgICBpZiAoaXNEZWYoY2guc2VsKSkge1xuICAgICAgICAgIGludm9rZURlc3Ryb3lIb29rKGNoKTtcbiAgICAgICAgICBsaXN0ZW5lcnMgPSBjYnMucmVtb3ZlLmxlbmd0aCArIDE7XG4gICAgICAgICAgcm0gPSBjcmVhdGVSbUNiKGNoLmVsbSwgbGlzdGVuZXJzKTtcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnJlbW92ZS5sZW5ndGg7ICsraSkgY2JzLnJlbW92ZVtpXShjaCwgcm0pO1xuICAgICAgICAgIGlmIChpc0RlZihpID0gY2guZGF0YSkgJiYgaXNEZWYoaSA9IGkuaG9vaykgJiYgaXNEZWYoaSA9IGkucmVtb3ZlKSkge1xuICAgICAgICAgICAgaShjaCwgcm0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBybSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHsgLy8gVGV4dCBub2RlXG4gICAgICAgICAgYXBpLnJlbW92ZUNoaWxkKHBhcmVudEVsbSwgY2guZWxtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuKHBhcmVudEVsbSwgb2xkQ2gsIG5ld0NoLCBpbnNlcnRlZFZub2RlUXVldWUpIHtcbiAgICB2YXIgb2xkU3RhcnRJZHggPSAwLCBuZXdTdGFydElkeCA9IDA7XG4gICAgdmFyIG9sZEVuZElkeCA9IG9sZENoLmxlbmd0aCAtIDE7XG4gICAgdmFyIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFswXTtcbiAgICB2YXIgb2xkRW5kVm5vZGUgPSBvbGRDaFtvbGRFbmRJZHhdO1xuICAgIHZhciBuZXdFbmRJZHggPSBuZXdDaC5sZW5ndGggLSAxO1xuICAgIHZhciBuZXdTdGFydFZub2RlID0gbmV3Q2hbMF07XG4gICAgdmFyIG5ld0VuZFZub2RlID0gbmV3Q2hbbmV3RW5kSWR4XTtcbiAgICB2YXIgb2xkS2V5VG9JZHgsIGlkeEluT2xkLCBlbG1Ub01vdmUsIGJlZm9yZTtcblxuICAgIHdoaWxlIChvbGRTdGFydElkeCA8PSBvbGRFbmRJZHggJiYgbmV3U3RhcnRJZHggPD0gbmV3RW5kSWR4KSB7XG4gICAgICBpZiAoaXNVbmRlZihvbGRTdGFydFZub2RlKSkge1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07IC8vIFZub2RlIGhhcyBiZWVuIG1vdmVkIGxlZnRcbiAgICAgIH0gZWxzZSBpZiAoaXNVbmRlZihvbGRFbmRWbm9kZSkpIHtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWbm9kZShvbGRTdGFydFZub2RlLCBuZXdTdGFydFZub2RlKSkge1xuICAgICAgICBwYXRjaFZub2RlKG9sZFN0YXJ0Vm5vZGUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIG9sZFN0YXJ0Vm5vZGUgPSBvbGRDaFsrK29sZFN0YXJ0SWR4XTtcbiAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkRW5kVm5vZGUsIG5ld0VuZFZub2RlKSkge1xuICAgICAgICBwYXRjaFZub2RlKG9sZEVuZFZub2RlLCBuZXdFbmRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgb2xkRW5kVm5vZGUgPSBvbGRDaFstLW9sZEVuZElkeF07XG4gICAgICAgIG5ld0VuZFZub2RlID0gbmV3Q2hbLS1uZXdFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3RW5kVm5vZGUpKSB7IC8vIFZub2RlIG1vdmVkIHJpZ2h0XG4gICAgICAgIHBhdGNoVm5vZGUob2xkU3RhcnRWbm9kZSwgbmV3RW5kVm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBvbGRTdGFydFZub2RlLmVsbSwgYXBpLm5leHRTaWJsaW5nKG9sZEVuZFZub2RlLmVsbSkpO1xuICAgICAgICBvbGRTdGFydFZub2RlID0gb2xkQ2hbKytvbGRTdGFydElkeF07XG4gICAgICAgIG5ld0VuZFZub2RlID0gbmV3Q2hbLS1uZXdFbmRJZHhdO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVm5vZGUob2xkRW5kVm5vZGUsIG5ld1N0YXJ0Vm5vZGUpKSB7IC8vIFZub2RlIG1vdmVkIGxlZnRcbiAgICAgICAgcGF0Y2hWbm9kZShvbGRFbmRWbm9kZSwgbmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKTtcbiAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnRFbG0sIG9sZEVuZFZub2RlLmVsbSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICBvbGRFbmRWbm9kZSA9IG9sZENoWy0tb2xkRW5kSWR4XTtcbiAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzVW5kZWYob2xkS2V5VG9JZHgpKSBvbGRLZXlUb0lkeCA9IGNyZWF0ZUtleVRvT2xkSWR4KG9sZENoLCBvbGRTdGFydElkeCwgb2xkRW5kSWR4KTtcbiAgICAgICAgaWR4SW5PbGQgPSBvbGRLZXlUb0lkeFtuZXdTdGFydFZub2RlLmtleV07XG4gICAgICAgIGlmIChpc1VuZGVmKGlkeEluT2xkKSkgeyAvLyBOZXcgZWxlbWVudFxuICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBjcmVhdGVFbG0obmV3U3RhcnRWbm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSwgb2xkU3RhcnRWbm9kZS5lbG0pO1xuICAgICAgICAgIG5ld1N0YXJ0Vm5vZGUgPSBuZXdDaFsrK25ld1N0YXJ0SWR4XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbG1Ub01vdmUgPSBvbGRDaFtpZHhJbk9sZF07XG4gICAgICAgICAgcGF0Y2hWbm9kZShlbG1Ub01vdmUsIG5ld1N0YXJ0Vm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICAgICAgb2xkQ2hbaWR4SW5PbGRdID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGFwaS5pbnNlcnRCZWZvcmUocGFyZW50RWxtLCBlbG1Ub01vdmUuZWxtLCBvbGRTdGFydFZub2RlLmVsbSk7XG4gICAgICAgICAgbmV3U3RhcnRWbm9kZSA9IG5ld0NoWysrbmV3U3RhcnRJZHhdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvbGRTdGFydElkeCA+IG9sZEVuZElkeCkge1xuICAgICAgYmVmb3JlID0gaXNVbmRlZihuZXdDaFtuZXdFbmRJZHgrMV0pID8gbnVsbCA6IG5ld0NoW25ld0VuZElkeCsxXS5lbG07XG4gICAgICBhZGRWbm9kZXMocGFyZW50RWxtLCBiZWZvcmUsIG5ld0NoLCBuZXdTdGFydElkeCwgbmV3RW5kSWR4LCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgIH0gZWxzZSBpZiAobmV3U3RhcnRJZHggPiBuZXdFbmRJZHgpIHtcbiAgICAgIHJlbW92ZVZub2RlcyhwYXJlbnRFbG0sIG9sZENoLCBvbGRTdGFydElkeCwgb2xkRW5kSWR4KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwYXRjaFZub2RlKG9sZFZub2RlLCB2bm9kZSwgaW5zZXJ0ZWRWbm9kZVF1ZXVlKSB7XG4gICAgdmFyIGksIGhvb2s7XG4gICAgaWYgKGlzRGVmKGkgPSB2bm9kZS5kYXRhKSAmJiBpc0RlZihob29rID0gaS5ob29rKSAmJiBpc0RlZihpID0gaG9vay5wcmVwYXRjaCkpIHtcbiAgICAgIGkob2xkVm5vZGUsIHZub2RlKTtcbiAgICB9XG4gICAgdmFyIGVsbSA9IHZub2RlLmVsbSA9IG9sZFZub2RlLmVsbSwgb2xkQ2ggPSBvbGRWbm9kZS5jaGlsZHJlbiwgY2ggPSB2bm9kZS5jaGlsZHJlbjtcbiAgICBpZiAob2xkVm5vZGUgPT09IHZub2RlKSByZXR1cm47XG4gICAgaWYgKCFzYW1lVm5vZGUob2xkVm5vZGUsIHZub2RlKSkge1xuICAgICAgdmFyIHBhcmVudEVsbSA9IGFwaS5wYXJlbnROb2RlKG9sZFZub2RlLmVsbSk7XG4gICAgICBlbG0gPSBjcmVhdGVFbG0odm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICBhcGkuaW5zZXJ0QmVmb3JlKHBhcmVudEVsbSwgZWxtLCBvbGRWbm9kZS5lbG0pO1xuICAgICAgcmVtb3ZlVm5vZGVzKHBhcmVudEVsbSwgW29sZFZub2RlXSwgMCwgMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpc0RlZih2bm9kZS5kYXRhKSkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGNicy51cGRhdGUubGVuZ3RoOyArK2kpIGNicy51cGRhdGVbaV0ob2xkVm5vZGUsIHZub2RlKTtcbiAgICAgIGkgPSB2bm9kZS5kYXRhLmhvb2s7XG4gICAgICBpZiAoaXNEZWYoaSkgJiYgaXNEZWYoaSA9IGkudXBkYXRlKSkgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgICBpZiAoaXNVbmRlZih2bm9kZS50ZXh0KSkge1xuICAgICAgaWYgKGlzRGVmKG9sZENoKSAmJiBpc0RlZihjaCkpIHtcbiAgICAgICAgaWYgKG9sZENoICE9PSBjaCkgdXBkYXRlQ2hpbGRyZW4oZWxtLCBvbGRDaCwgY2gsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVmKGNoKSkge1xuICAgICAgICBpZiAoaXNEZWYob2xkVm5vZGUudGV4dCkpIGFwaS5zZXRUZXh0Q29udGVudChlbG0sICcnKTtcbiAgICAgICAgYWRkVm5vZGVzKGVsbSwgbnVsbCwgY2gsIDAsIGNoLmxlbmd0aCAtIDEsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVmKG9sZENoKSkge1xuICAgICAgICByZW1vdmVWbm9kZXMoZWxtLCBvbGRDaCwgMCwgb2xkQ2gubGVuZ3RoIC0gMSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVmKG9sZFZub2RlLnRleHQpKSB7XG4gICAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sICcnKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9sZFZub2RlLnRleHQgIT09IHZub2RlLnRleHQpIHtcbiAgICAgIGFwaS5zZXRUZXh0Q29udGVudChlbG0sIHZub2RlLnRleHQpO1xuICAgIH1cbiAgICBpZiAoaXNEZWYoaG9vaykgJiYgaXNEZWYoaSA9IGhvb2sucG9zdHBhdGNoKSkge1xuICAgICAgaShvbGRWbm9kZSwgdm5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihvbGRWbm9kZSwgdm5vZGUpIHtcbiAgICB2YXIgaSwgZWxtLCBwYXJlbnQ7XG4gICAgdmFyIGluc2VydGVkVm5vZGVRdWV1ZSA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGkgPCBjYnMucHJlLmxlbmd0aDsgKytpKSBjYnMucHJlW2ldKCk7XG5cbiAgICBpZiAoaXNVbmRlZihvbGRWbm9kZS5zZWwpKSB7XG4gICAgICBvbGRWbm9kZSA9IGVtcHR5Tm9kZUF0KG9sZFZub2RlKTtcbiAgICB9XG5cbiAgICBpZiAoc2FtZVZub2RlKG9sZFZub2RlLCB2bm9kZSkpIHtcbiAgICAgIHBhdGNoVm5vZGUob2xkVm5vZGUsIHZub2RlLCBpbnNlcnRlZFZub2RlUXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbG0gPSBvbGRWbm9kZS5lbG07XG4gICAgICBwYXJlbnQgPSBhcGkucGFyZW50Tm9kZShlbG0pO1xuXG4gICAgICBjcmVhdGVFbG0odm5vZGUsIGluc2VydGVkVm5vZGVRdWV1ZSk7XG5cbiAgICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgYXBpLmluc2VydEJlZm9yZShwYXJlbnQsIHZub2RlLmVsbSwgYXBpLm5leHRTaWJsaW5nKGVsbSkpO1xuICAgICAgICByZW1vdmVWbm9kZXMocGFyZW50LCBbb2xkVm5vZGVdLCAwLCAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgaW5zZXJ0ZWRWbm9kZVF1ZXVlLmxlbmd0aDsgKytpKSB7XG4gICAgICBpbnNlcnRlZFZub2RlUXVldWVbaV0uZGF0YS5ob29rLmluc2VydChpbnNlcnRlZFZub2RlUXVldWVbaV0pO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgY2JzLnBvc3QubGVuZ3RoOyArK2kpIGNicy5wb3N0W2ldKCk7XG4gICAgcmV0dXJuIHZub2RlO1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtpbml0OiBpbml0fTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsLCBkYXRhLCBjaGlsZHJlbiwgdGV4dCwgZWxtKSB7XG4gIHZhciBrZXkgPSBkYXRhID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBkYXRhLmtleTtcbiAgcmV0dXJuIHtzZWw6IHNlbCwgZGF0YTogZGF0YSwgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICAgIHRleHQ6IHRleHQsIGVsbTogZWxtLCBrZXk6IGtleX07XG59O1xuIiwiZnVuY3Rpb24gdXBkYXRlUHJvcHMob2xkVm5vZGUsIHZub2RlKSB7XHJcbiAgICBsZXQga2V5LCBjdXIsIG9sZCwgZWxtID0gdm5vZGUuZWxtLFxyXG4gICAgICAgIHByb3BzID0gdm5vZGUuZGF0YS5saXZlUHJvcHMgfHwge307XHJcbiAgICBmb3IgKGtleSBpbiBwcm9wcykge1xyXG4gICAgICAgIGN1ciA9IHByb3BzW2tleV07XHJcbiAgICAgICAgb2xkID0gZWxtW2tleV07XHJcbiAgICAgICAgaWYgKG9sZCAhPT0gY3VyKSBlbG1ba2V5XSA9IGN1cjtcclxuICAgIH1cclxufVxyXG5jb25zdCBsaXZlUHJvcHNQbHVnaW4gPSB7Y3JlYXRlOiB1cGRhdGVQcm9wcywgdXBkYXRlOiB1cGRhdGVQcm9wc307XHJcbmltcG9ydCBzbmFiYmRvbSBmcm9tIFwic25hYmJkb21cIlxyXG5pbXBvcnQgaCBmcm9tIFwic25hYmJkb20vaFwiXHJcbmNvbnN0IHBhdGNoID0gc25hYmJkb20uaW5pdChbXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL3N0eWxlJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnKSxcclxuICAgIGxpdmVQcm9wc1BsdWdpblxyXG5dKTtcclxuXHJcbmZ1bmN0aW9uIHV1aWQoKXtyZXR1cm4oXCJcIisxZTcrLTFlMystNGUzKy04ZTMrLTFlMTEpLnJlcGxhY2UoL1sxMF0vZyxmdW5jdGlvbigpe3JldHVybigwfE1hdGgucmFuZG9tKCkqMTYpLnRvU3RyaW5nKDE2KX0pfVxyXG5pbXBvcnQgYmlnIGZyb20gJy4uL25vZGVfbW9kdWxlcy9iaWcuanMnXHJcbmJpZy5FX1BPUyA9IDFlKzZcclxuXHJcbmltcG9ydCB1Z25pcyBmcm9tICcuL3VnbmlzJ1xyXG5pbXBvcnQgc2F2ZWRBcHAgZnJvbSAnLi4vdWduaXNfY29tcG9uZW50cy9hcHAuanNvbidcclxuXHJcbmZ1bmN0aW9uIG1vdmVJbkFycmF5IChhcnJheSwgbW92ZUluZGV4LCB0b0luZGV4KSB7XHJcbiAgICBsZXQgaXRlbSA9IGFycmF5W21vdmVJbmRleF07XHJcbiAgICBsZXQgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xyXG4gICAgbGV0IGRpZmYgPSBtb3ZlSW5kZXggLSB0b0luZGV4O1xyXG5cclxuICAgIGlmIChkaWZmID4gMCkge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIC4uLmFycmF5LnNsaWNlKDAsIHRvSW5kZXgpLFxyXG4gICAgICAgICAgICBpdGVtLFxyXG4gICAgICAgICAgICAuLi5hcnJheS5zbGljZSh0b0luZGV4LCBtb3ZlSW5kZXgpLFxyXG4gICAgICAgICAgICAuLi5hcnJheS5zbGljZShtb3ZlSW5kZXggKyAxLCBsZW5ndGgpXHJcbiAgICAgICAgXTtcclxuICAgIH0gZWxzZSBpZiAoZGlmZiA8IDApIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAuLi5hcnJheS5zbGljZSgwLCBtb3ZlSW5kZXgpLFxyXG4gICAgICAgICAgICAuLi5hcnJheS5zbGljZShtb3ZlSW5kZXggKyAxLCB0b0luZGV4ICsgMSksXHJcbiAgICAgICAgICAgIGl0ZW0sXHJcbiAgICAgICAgICAgIC4uLmFycmF5LnNsaWNlKHRvSW5kZXggKyAxLCBsZW5ndGgpXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuICAgIHJldHVybiBhcnJheTtcclxufVxyXG5cclxuY29uc3QgYXR0YWNoRmFzdENsaWNrID0gcmVxdWlyZSgnZmFzdGNsaWNrJylcclxuYXR0YWNoRmFzdENsaWNrKGRvY3VtZW50LmJvZHkpXHJcblxyXG5jb25zdCB2ZXJzaW9uID0gJzAuMC4zMXYnXHJcbmVkaXRvcihzYXZlZEFwcClcclxuXHJcbmZ1bmN0aW9uIGVkaXRvcihhcHBEZWZpbml0aW9uKXtcclxuXHJcbiAgICBjb25zdCBzYXZlZERlZmluaXRpb24gPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdhcHBfa2V5XycgKyB2ZXJzaW9uKSlcclxuICAgIGNvbnN0IGFwcCA9IHVnbmlzKHNhdmVkRGVmaW5pdGlvbiB8fCBhcHBEZWZpbml0aW9uKVxyXG5cclxuICAgIGxldCBub2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSlcclxuXHJcbiAgICAvLyBTdGF0ZVxyXG4gICAgbGV0IHN0YXRlID0ge1xyXG4gICAgICAgIGxlZnRPcGVuOiBmYWxzZSxcclxuICAgICAgICByaWdodE9wZW46IHRydWUsXHJcbiAgICAgICAgZnVsbFNjcmVlbjogZmFsc2UsXHJcbiAgICAgICAgZWRpdG9yUmlnaHRXaWR0aDogMzUwLFxyXG4gICAgICAgIGVkaXRvckxlZnRXaWR0aDogMzUwLFxyXG4gICAgICAgIHN1YkVkaXRvcldpZHRoOiAzNTAsXHJcbiAgICAgICAgY29tcG9uZW50RWRpdG9yUG9zaXRpb246IHt4OiB3aW5kb3cuaW5uZXJXaWR0aCAtIDcxMCwgeTogd2luZG93LmlubmVySGVpZ2h0IC8gMn0gLFxyXG4gICAgICAgIGFwcElzRnJvemVuOiBmYWxzZSxcclxuICAgICAgICBzZWxlY3RlZFZpZXdOb2RlOiB7fSxcclxuICAgICAgICBzZWxlY3RlZFBpcGVJZDogJycsXHJcbiAgICAgICAgc2VsZWN0ZWRTdGF0ZU5vZGVJZDogJycsXHJcbiAgICAgICAgc2VsZWN0ZWRWaWV3U3ViTWVudTogJ3Byb3BzJyxcclxuICAgICAgICBlZGl0aW5nVGl0bGVOb2RlSWQ6ICcnLFxyXG4gICAgICAgIHZpZXdGb2xkZXJzQ2xvc2VkOiB7fSxcclxuICAgICAgICBkcmFnZ2VkQ29tcG9uZW50VmlldzogbnVsbCxcclxuICAgICAgICBkcmFnZ2VkQ29tcG9uZW50U3RhdGVJZDogbnVsbCxcclxuICAgICAgICBob3ZlcmVkUGlwZTogbnVsbCxcclxuICAgICAgICBob3ZlcmVkVmlld05vZGU6IG51bGwsXHJcbiAgICAgICAgbW91c2VQb3NpdGlvbjoge30sXHJcbiAgICAgICAgZXZlbnRTdGFjazogW10sXHJcbiAgICAgICAgZGVmaW5pdGlvbjogc2F2ZWREZWZpbml0aW9uIHx8IGFwcC5kZWZpbml0aW9uLFxyXG4gICAgfVxyXG4gICAgLy8gdW5kby9yZWRvXHJcbiAgICBsZXQgc3RhdGVTdGFjayA9IFtzdGF0ZS5kZWZpbml0aW9uXVxyXG4gICAgbGV0IGN1cnJlbnRBbmltYXRpb25GcmFtZVJlcXVlc3QgPSBudWxsO1xyXG4gICAgZnVuY3Rpb24gc2V0U3RhdGUobmV3U3RhdGUsIHRpbWVUcmF2ZWxpbmcpe1xyXG4gICAgICAgIGlmKG5ld1N0YXRlID09PSBzdGF0ZSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybignc3RhdGUgd2FzIG11dGF0ZWQsIHNlYXJjaCBmb3IgYSBidWcnKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihzdGF0ZS5kZWZpbml0aW9uICE9PSBuZXdTdGF0ZS5kZWZpbml0aW9uKXtcclxuICAgICAgICAgICAgLy8gdW5zZWxlY3QgZGVsZXRlZCBjb21wb25lbnRzIGFuZCBzdGF0ZVxyXG4gICAgICAgICAgICBpZihuZXdTdGF0ZS5kZWZpbml0aW9uLnN0YXRlW25ld1N0YXRlLnNlbGVjdGVkU3RhdGVOb2RlSWRdID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgICAgbmV3U3RhdGUgPSB7Li4ubmV3U3RhdGUsIHNlbGVjdGVkU3RhdGVOb2RlSWQ6ICcnfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKG5ld1N0YXRlLnNlbGVjdGVkVmlld05vZGUucmVmICE9PSB1bmRlZmluZWQgJiYgbmV3U3RhdGUuZGVmaW5pdGlvbltuZXdTdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZl1bbmV3U3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZF0gPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgICAgICBuZXdTdGF0ZSA9IHsuLi5uZXdTdGF0ZSwgc2VsZWN0ZWRWaWV3Tm9kZToge319XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gdW5kby9yZWRvIHRoZW4gcmVuZGVyIHRoZW4gc2F2ZVxyXG4gICAgICAgICAgICBpZighdGltZVRyYXZlbGluZyl7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SW5kZXggPSBzdGF0ZVN0YWNrLmZpbmRJbmRleCgoYSk9PmE9PT1zdGF0ZS5kZWZpbml0aW9uKVxyXG4gICAgICAgICAgICAgICAgc3RhdGVTdGFjayA9IHN0YXRlU3RhY2suc2xpY2UoMCwgY3VycmVudEluZGV4KzEpLmNvbmNhdChuZXdTdGF0ZS5kZWZpbml0aW9uKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFwcC5yZW5kZXIobmV3U3RhdGUuZGVmaW5pdGlvbilcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKT0+bG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2FwcF9rZXlfJyt2ZXJzaW9uLCBKU09OLnN0cmluZ2lmeShuZXdTdGF0ZS5kZWZpbml0aW9uKSksIDApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihzdGF0ZS5hcHBJc0Zyb3plbiAhPT0gbmV3U3RhdGUuYXBwSXNGcm96ZW4gfHwgc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZSAhPT0gbmV3U3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZSApe1xyXG4gICAgICAgICAgICBhcHAuX2ZyZWV6ZShuZXdTdGF0ZS5hcHBJc0Zyb3plbiwgVklFV19OT0RFX1NFTEVDVEVELCBuZXdTdGF0ZS5zZWxlY3RlZFZpZXdOb2RlKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihuZXdTdGF0ZS5lZGl0aW5nVGl0bGVOb2RlSWQgJiYgc3RhdGUuZWRpdGluZ1RpdGxlTm9kZUlkICE9PSBuZXdTdGF0ZS5lZGl0aW5nVGl0bGVOb2RlSWQpe1xyXG4gICAgICAgICAgICAvLyBxdWUgYXV0byBmb2N1c1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWlzdGl0bGVlZGl0b3JdJylbMF1cclxuICAgICAgICAgICAgICAgIGlmKG5vZGUpe1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuZm9jdXMoKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAwKVxyXG4gICAgICAgIH1cclxuICAgICAgICBzdGF0ZSA9IG5ld1N0YXRlXHJcbiAgICAgICAgaWYoIWN1cnJlbnRBbmltYXRpb25GcmFtZVJlcXVlc3Qpe1xyXG4gICAgICAgICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcilcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKT0+IHtcclxuICAgICAgICAvLyBjbGlja2VkIG91dHNpZGVcclxuICAgICAgICBpZihzdGF0ZS5lZGl0aW5nVGl0bGVOb2RlSWQgJiYgIWUudGFyZ2V0LmRhdGFzZXQuaXN0aXRsZWVkaXRvcil7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZWRpdGluZ1RpdGxlTm9kZUlkOiAnJ30pXHJcbiAgICAgICAgfVxyXG4gICAgfSlcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJlbmRlcigpXHJcbiAgICB9LCBmYWxzZSlcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwib3JpZW50YXRpb25jaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmVuZGVyKClcclxuICAgIH0sIGZhbHNlKVxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKT0+e1xyXG4gICAgICAgIC8vIDgzIC0gc1xyXG4gICAgICAgIC8vIDkwIC0gelxyXG4gICAgICAgIC8vIDg5IC0geVxyXG4gICAgICAgIC8vIDMyIC0gc3BhY2VcclxuICAgICAgICAvLyAxMyAtIGVudGVyXHJcbiAgICAgICAgLy8gMjcgLSBlc2NhcGVcclxuICAgICAgICBpZihlLndoaWNoID09PSA4MyAmJiAobmF2aWdhdG9yLnBsYXRmb3JtLm1hdGNoKFwiTWFjXCIpID8gZS5tZXRhS2V5IDogZS5jdHJsS2V5KSkge1xyXG4gICAgICAgICAgICAvLyBUT0RPIGdhcmJhZ2UgY29sbGVjdFxyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGZldGNoKCcvc2F2ZScsIHttZXRob2Q6ICdQT1NUJywgYm9keTogSlNPTi5zdHJpbmdpZnkoc3RhdGUuZGVmaW5pdGlvbiksIGhlYWRlcnM6IHtcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIn19KVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGUud2hpY2ggPT09IDMyICYmIChuYXZpZ2F0b3IucGxhdGZvcm0ubWF0Y2goXCJNYWNcIikgPyBlLm1ldGFLZXkgOiBlLmN0cmxLZXkpKSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgICAgICBGUkVFWkVSX0NMSUNLRUQoKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZighZS5zaGlmdEtleSAmJiBlLndoaWNoID09PSA5MCAmJiAobmF2aWdhdG9yLnBsYXRmb3JtLm1hdGNoKFwiTWFjXCIpID8gZS5tZXRhS2V5IDogZS5jdHJsS2V5KSkge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRJbmRleCA9IHN0YXRlU3RhY2suZmluZEluZGV4KChhKT0+YT09PXN0YXRlLmRlZmluaXRpb24pXHJcbiAgICAgICAgICAgIGlmKGN1cnJlbnRJbmRleCA+IDApe1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3RGVmaW5pdGlvbiA9IHN0YXRlU3RhY2tbY3VycmVudEluZGV4LTFdXHJcbiAgICAgICAgICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246IG5ld0RlZmluaXRpb259LCB0cnVlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKChlLndoaWNoID09PSA4OSAmJiAobmF2aWdhdG9yLnBsYXRmb3JtLm1hdGNoKFwiTWFjXCIpID8gZS5tZXRhS2V5IDogZS5jdHJsS2V5KSkgfHwgKGUuc2hpZnRLZXkgJiYgZS53aGljaCA9PT0gOTAgJiYgKG5hdmlnYXRvci5wbGF0Zm9ybS5tYXRjaChcIk1hY1wiKSA/IGUubWV0YUtleSA6IGUuY3RybEtleSkpKSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gc3RhdGVTdGFjay5maW5kSW5kZXgoKGEpPT5hPT09c3RhdGUuZGVmaW5pdGlvbilcclxuICAgICAgICAgICAgaWYoY3VycmVudEluZGV4IDwgc3RhdGVTdGFjay5sZW5ndGgtMSl7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdEZWZpbml0aW9uID0gc3RhdGVTdGFja1tjdXJyZW50SW5kZXgrMV1cclxuICAgICAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjogbmV3RGVmaW5pdGlvbn0sIHRydWUpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZS53aGljaCA9PT0gMTMpIHtcclxuICAgICAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBlZGl0aW5nVGl0bGVOb2RlSWQ6ICcnfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZS53aGljaCA9PT0gMjcpIHtcclxuICAgICAgICAgICAgRlVMTF9TQ1JFRU5fQ0xJQ0tFRChmYWxzZSlcclxuICAgICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIC8vIExpc3RlbiB0byBhcHBcclxuICAgIGFwcC5hZGRMaXN0ZW5lcigoZXZlbnRJZCwgZGF0YSwgZSwgcHJldmlvdXNTdGF0ZSwgY3VycmVudFN0YXRlLCBtdXRhdGlvbnMpPT57XHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBldmVudFN0YWNrOiBzdGF0ZS5ldmVudFN0YWNrLmNvbmNhdCh7ZXZlbnRJZCwgZGF0YSwgZSwgcHJldmlvdXNTdGF0ZSwgY3VycmVudFN0YXRlLCBtdXRhdGlvbnN9KX0pXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEFjdGlvbnNcclxuICAgIGxldCBvcGVuQm94VGltZW91dCA9IG51bGxcclxuICAgIGZ1bmN0aW9uIFZJRVdfRFJBR0dFRChub2RlUmVmLCBwYXJlbnRSZWYsIGluaXRpYWxEZXB0aCwgZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgIGNvbnN0IGlzQXJyb3cgPSBlLnRhcmdldC5kYXRhc2V0LmNsb3NlYXJyb3dcclxuICAgICAgICBjb25zdCBpc1RyYXNoY2FuID0gZS50YXJnZXQuZGF0YXNldC50cmFzaGNhblxyXG4gICAgICAgIGNvbnN0IGluaXRpYWxYID0gZS50b3VjaGVzPyBlLnRvdWNoZXNbMF0ucGFnZVg6IGUucGFnZVhcclxuICAgICAgICBjb25zdCBpbml0aWFsWSA9IGUudG91Y2hlcz8gZS50b3VjaGVzWzBdLnBhZ2VZOiBlLnBhZ2VZXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmVsbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldFggPSBpbml0aWFsWCAtIHBvc2l0aW9uLmxlZnRcclxuICAgICAgICBjb25zdCBvZmZzZXRZID0gaW5pdGlhbFkgLSBwb3NpdGlvbi50b3BcclxuICAgICAgICBmdW5jdGlvbiBkcmFnKGUpe1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICAgICAgY29uc3QgeCA9IGUudG91Y2hlcz8gZS50b3VjaGVzWzBdLnBhZ2VYOiBlLnBhZ2VYXHJcbiAgICAgICAgICAgIGNvbnN0IHkgPSBlLnRvdWNoZXM/IGUudG91Y2hlc1swXS5wYWdlWTogZS5wYWdlWVxyXG4gICAgICAgICAgICBpZighc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcpe1xyXG4gICAgICAgICAgICAgICAgaWYoTWF0aC5hYnMoaW5pdGlhbFkteSkgPiAzKXtcclxuICAgICAgICAgICAgICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRyYWdnZWRDb21wb25lbnRWaWV3OiB7Li4ubm9kZVJlZiwgZGVwdGg6IGluaXRpYWxEZXB0aH0sIG1vdXNlUG9zaXRpb246IHt4OiB4IC0gb2Zmc2V0WCwgeTogeSAtIG9mZnNldFl9fSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgbW91c2VQb3NpdGlvbjoge3g6IHggLSBvZmZzZXRYLCB5OiB5IC0gb2Zmc2V0WX19KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZylcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZHJhZylcclxuICAgICAgICBmdW5jdGlvbiBzdG9wRHJhZ2dpbmcoZXZlbnQpe1xyXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnKVxyXG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZHJhZylcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzdG9wRHJhZ2dpbmcpXHJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHN0b3BEcmFnZ2luZylcclxuICAgICAgICAgICAgaWYob3BlbkJveFRpbWVvdXQpe1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KG9wZW5Cb3hUaW1lb3V0KVxyXG4gICAgICAgICAgICAgICAgb3BlbkJveFRpbWVvdXQgPSBudWxsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoIXN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3KXtcclxuICAgICAgICAgICAgICAgIGlmKGV2ZW50LnRhcmdldCA9PT0gZS50YXJnZXQgJiYgaXNBcnJvdyl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZJRVdfRk9MREVSX0NMSUNLRUQobm9kZVJlZi5pZClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKGV2ZW50LnRhcmdldCA9PT0gZS50YXJnZXQgJiYgaXNUcmFzaGNhbil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERFTEVURV9TRUxFQ1RFRF9WSUVXKG5vZGVSZWYsIHBhcmVudFJlZilcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBWSUVXX05PREVfU0VMRUNURUQobm9kZVJlZilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZighc3RhdGUuaG92ZXJlZFZpZXdOb2RlKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRyYWdnZWRDb21wb25lbnRWaWV3OiBudWxsLH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbmV3UGFyZW50UmVmID0gc3RhdGUuaG92ZXJlZFZpZXdOb2RlLnBhcmVudFxyXG4gICAgICAgICAgICAvLyBmcmFtZSB0aGlzIHNvbWV3aGVyZSBvbiBob3cgbm90IHRvIHdyaXRlIGNvZGVcclxuICAgICAgICAgICAgY29uc3QgZml4ZWRQYXJlbnRzID0ge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUsXHJcbiAgICAgICAgICAgICAgICBkcmFnZ2VkQ29tcG9uZW50VmlldzogbnVsbCxcclxuICAgICAgICAgICAgICAgIGhvdmVyZWRWaWV3Tm9kZTogbnVsbCxcclxuICAgICAgICAgICAgICAgIGRlZmluaXRpb246IHBhcmVudFJlZi5pZCA9PT0gbmV3UGFyZW50UmVmLmlkID8geyAvLyBtb3ZpbmcgaW4gdGhlIHNhbWUgcGFyZW50XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBbcGFyZW50UmVmLnJlZl06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbltwYXJlbnRSZWYucmVmXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW3BhcmVudFJlZi5pZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb25bcGFyZW50UmVmLnJlZl1bcGFyZW50UmVmLmlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBtb3ZlSW5BcnJheShzdGF0ZS5kZWZpbml0aW9uW3BhcmVudFJlZi5yZWZdW3BhcmVudFJlZi5pZF0uY2hpbGRyZW4sIHN0YXRlLmRlZmluaXRpb25bcGFyZW50UmVmLnJlZl1bcGFyZW50UmVmLmlkXS5jaGlsZHJlbi5maW5kSW5kZXgoKHJlZik9PiByZWYuaWQgPT09IG5vZGVSZWYuaWQpLCBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucG9zaXRpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IDogcGFyZW50UmVmLnJlZiA9PT0gbmV3UGFyZW50UmVmLnJlZiA/IHsgLy8gbW92aW5nIGluIHRoZSBzaW1pbGFyIHBhcmVudCAoc2FtZSB0eXBlKVxyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgW3BhcmVudFJlZi5yZWZdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb25bcGFyZW50UmVmLnJlZl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFtwYXJlbnRSZWYuaWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uW3BhcmVudFJlZi5yZWZdW3BhcmVudFJlZi5pZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbltwYXJlbnRSZWYucmVmXVtwYXJlbnRSZWYuaWRdLmNoaWxkcmVuLmZpbHRlcigocmVmKT0+IHJlZi5pZCAhPT0gbm9kZVJlZi5pZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW25ld1BhcmVudFJlZi5pZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb25bbmV3UGFyZW50UmVmLnJlZl1bbmV3UGFyZW50UmVmLmlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBzdGF0ZS5kZWZpbml0aW9uW25ld1BhcmVudFJlZi5yZWZdW25ld1BhcmVudFJlZi5pZF0uY2hpbGRyZW4uc2xpY2UoMCwgc3RhdGUuaG92ZXJlZFZpZXdOb2RlLnBvc2l0aW9uKS5jb25jYXQobm9kZVJlZiwgc3RhdGUuZGVmaW5pdGlvbltuZXdQYXJlbnRSZWYucmVmXVtuZXdQYXJlbnRSZWYuaWRdLmNoaWxkcmVuLnNsaWNlKHN0YXRlLmhvdmVyZWRWaWV3Tm9kZS5wb3NpdGlvbikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSA6IHsgLy8gbW92aW5nIHRvIGEgbmV3IHR5cGUgcGFyZW50XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBbcGFyZW50UmVmLnJlZl06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbltwYXJlbnRSZWYucmVmXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW3BhcmVudFJlZi5pZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb25bcGFyZW50UmVmLnJlZl1bcGFyZW50UmVmLmlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBzdGF0ZS5kZWZpbml0aW9uW3BhcmVudFJlZi5yZWZdW3BhcmVudFJlZi5pZF0uY2hpbGRyZW4uZmlsdGVyKChyZWYpPT4gcmVmLmlkICE9PSBub2RlUmVmLmlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgW25ld1BhcmVudFJlZi5yZWZdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb25bbmV3UGFyZW50UmVmLnJlZl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFtuZXdQYXJlbnRSZWYuaWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uW25ld1BhcmVudFJlZi5yZWZdW25ld1BhcmVudFJlZi5pZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbltuZXdQYXJlbnRSZWYucmVmXVtuZXdQYXJlbnRSZWYuaWRdLmNoaWxkcmVuLnNsaWNlKDAsIHN0YXRlLmhvdmVyZWRWaWV3Tm9kZS5wb3NpdGlvbikuY29uY2F0KG5vZGVSZWYsIHN0YXRlLmRlZmluaXRpb25bbmV3UGFyZW50UmVmLnJlZl1bbmV3UGFyZW50UmVmLmlkXS5jaGlsZHJlbi5zbGljZShzdGF0ZS5ob3ZlcmVkVmlld05vZGUucG9zaXRpb24pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgLi4uZml4ZWRQYXJlbnRzLFxyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLmZpeGVkUGFyZW50cy5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIFtub2RlUmVmLnJlZl06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uZml4ZWRQYXJlbnRzLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBbbm9kZVJlZi5pZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmZpeGVkUGFyZW50cy5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlUmVmLmlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbmV3UGFyZW50UmVmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzdG9wRHJhZ2dpbmcpXHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgc3RvcERyYWdnaW5nKVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIEhPVkVSX01PQklMRShlKSB7XHJcbiAgICAgICAgY29uc3QgZWxlbSA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoZS50b3VjaGVzWzBdLmNsaWVudFgsIGUudG91Y2hlc1swXS5jbGllbnRZKVxyXG4gICAgICAgIGNvbnN0IG1vdmVFdmVudCA9IG5ldyBNb3VzZUV2ZW50KCdtb3VzZW1vdmUnLCB7XHJcbiAgICAgICAgICAgIGJ1YmJsZXM6IHRydWUsXHJcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIHZpZXc6IHdpbmRvdyxcclxuICAgICAgICAgICAgY2xpZW50WDogZS50b3VjaGVzWzBdLmNsaWVudFgsXHJcbiAgICAgICAgICAgIGNsaWVudFk6IGUudG91Y2hlc1swXS5jbGllbnRZLFxyXG4gICAgICAgICAgICBzY3JlZW5YOiBlLnRvdWNoZXNbMF0uc2NyZWVuWCxcclxuICAgICAgICAgICAgc2NyZWVuWTogZS50b3VjaGVzWzBdLnNjcmVlblksXHJcbiAgICAgICAgfSlcclxuICAgICAgICBlbGVtLmRpc3BhdGNoRXZlbnQobW92ZUV2ZW50KVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIFZJRVdfSE9WRVJFRChub2RlUmVmLCBwYXJlbnRSZWYsIGRlcHRoLCBlKSB7XHJcbiAgICAgICAgaWYoIXN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3KXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBoaXRQb3NpdGlvbiA9IChlLnRvdWNoZXM/IDI4OiBlLmxheWVyWSkgLyAyOFxyXG4gICAgICAgIGNvbnN0IGluc2VydEJlZm9yZSAgPSAoKT0+IHNldFN0YXRlKHsuLi5zdGF0ZSwgaG92ZXJlZFZpZXdOb2RlOiB7cGFyZW50OiBwYXJlbnRSZWYsIGRlcHRoLCBwb3NpdGlvbjogc3RhdGUuZGVmaW5pdGlvbltwYXJlbnRSZWYucmVmXVtwYXJlbnRSZWYuaWRdLmNoaWxkcmVuLmZpbHRlcigocmVmKT0+IHJlZi5pZCAhPT0gc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcuaWQpLmZpbmRJbmRleCgocmVmKT0+cmVmLmlkID09PSBub2RlUmVmLmlkKX19KVxyXG4gICAgICAgIGNvbnN0IGluc2VydEFmdGVyICAgPSAoKT0+IHNldFN0YXRlKHsuLi5zdGF0ZSwgaG92ZXJlZFZpZXdOb2RlOiB7cGFyZW50OiBwYXJlbnRSZWYsIGRlcHRoLCBwb3NpdGlvbjogc3RhdGUuZGVmaW5pdGlvbltwYXJlbnRSZWYucmVmXVtwYXJlbnRSZWYuaWRdLmNoaWxkcmVuLmZpbHRlcigocmVmKT0+IHJlZi5pZCAhPT0gc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcuaWQpLmZpbmRJbmRleCgocmVmKT0+cmVmLmlkID09PSBub2RlUmVmLmlkKSArIDF9fSlcclxuICAgICAgICBjb25zdCBpbnNlcnRBc0ZpcnN0ID0gKCk9PiBzZXRTdGF0ZSh7Li4uc3RhdGUsIGhvdmVyZWRWaWV3Tm9kZToge3BhcmVudDogbm9kZVJlZiwgZGVwdGg6IGRlcHRoKzEsIHBvc2l0aW9uOiAwfX0pXHJcbiAgICAgICAgY29uc3QgaW5zZXJ0QXNMYXN0ID0gKCk9PiBzZXRTdGF0ZSh7Li4uc3RhdGUsIGhvdmVyZWRWaWV3Tm9kZToge3BhcmVudDoge3JlZjogJ3ZOb2RlQm94JywgaWQ6ICdfcm9vdE5vZGUnfSwgZGVwdGg6IDEsIHBvc2l0aW9uOiBzdGF0ZS5kZWZpbml0aW9uWyd2Tm9kZUJveCddWydfcm9vdE5vZGUnXS5jaGlsZHJlbi5sZW5ndGh9fSlcclxuICAgICAgICBjb25zdCBpbnNlcnRBdCA9ICh0b1B1dFJlZiwgaW5kZXgpPT4gc2V0U3RhdGUoey4uLnN0YXRlLCBob3ZlcmVkVmlld05vZGU6IHtwYXJlbnQ6IHRvUHV0UmVmLCBkZXB0aDogZGVwdGgtMSwgcG9zaXRpb246IGluZGV4KzF9fSlcclxuXHJcbiAgICAgICAgaWYobm9kZVJlZi5pZCA9PT0gc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcuaWQpe1xyXG4gICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBzdGF0ZS5kZWZpbml0aW9uW3BhcmVudFJlZi5yZWZdW3BhcmVudFJlZi5pZF1cclxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgdGhlIGxhc3QgY2hpbGQsIGlmIHllcywgZ28gdG8gZ3JhbmRwYXJlbnQgYW5kIGRyb3AgdGhlcmUgYWZ0ZXIgcGFyZW50XHJcbiAgICAgICAgICAgIGlmKHBhcmVudC5jaGlsZHJlbltwYXJlbnQuY2hpbGRyZW4ubGVuZ3RoIC0gMV0uaWQgPT09IG5vZGVSZWYuaWQpe1xyXG4gICAgICAgICAgICAgICAgaWYocGFyZW50UmVmLmlkICE9PSAnX3Jvb3ROb2RlJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdyYW5kcGFyZW50ID0gc3RhdGUuZGVmaW5pdGlvbltwYXJlbnQucGFyZW50LnJlZl1bcGFyZW50LnBhcmVudC5pZF1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRQb3NpdGlvbiA9IGdyYW5kcGFyZW50LmNoaWxkcmVuLmZpbmRJbmRleCgoY2hpbGRSZWYpPT4gY2hpbGRSZWYuaWQgPT09IHBhcmVudFJlZi5pZClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5zZXJ0QXQocGFyZW50LnBhcmVudCwgcGFyZW50UG9zaXRpb24pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHsuLi5zdGF0ZSwgaG92ZXJlZFZpZXdOb2RlOiBudWxsLH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKG5vZGVSZWYuaWQgPT09ICdfcm9vdE5vZGUnKXtcclxuICAgICAgICAgICAgcmV0dXJuIGluc2VydEFzRmlyc3QoKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihub2RlUmVmLmlkID09PSAnX2xhc3ROb2RlJyl7XHJcbiAgICAgICAgICAgIHJldHVybiBpbnNlcnRBc0xhc3QoKVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBwcmF5IHRvIGdvZCB0aGF0IHlvdSBkaWQgbm90IG1ha2UgYSBtaXN0YWtlIGhlcmVcclxuICAgICAgICBpZihzdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlUmVmLmlkXS5jaGlsZHJlbil7IC8vIGlmIGJveFxyXG4gICAgICAgICAgICBpZihzdGF0ZS52aWV3Rm9sZGVyc0Nsb3NlZFtub2RlUmVmLmlkXSB8fCBzdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlUmVmLmlkXS5jaGlsZHJlbi5sZW5ndGggPT09IDApeyAvLyBpZiBjbG9zZWQgb3IgZW1wdHkgYm94XHJcbiAgICAgICAgICAgICAgICBpZihoaXRQb3NpdGlvbiA8IDAuMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QmVmb3JlKClcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIW9wZW5Cb3hUaW1lb3V0KXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkJveFRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpPT5WSUVXX0ZPTERFUl9DTElDS0VEKG5vZGVSZWYuaWQsIGZhbHNlKSwgNTAwKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBc0ZpcnN0KClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHsgLy8gb3BlbiBib3hcclxuICAgICAgICAgICAgICAgIGlmKGhpdFBvc2l0aW9uIDwgMC41KXtcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRCZWZvcmUoKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBc0ZpcnN0KClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7IC8vIHNpbXBsZSBub2RlXHJcbiAgICAgICAgICAgIGlmKGhpdFBvc2l0aW9uIDwgMC41KXtcclxuICAgICAgICAgICAgICAgIGluc2VydEJlZm9yZSgpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcigpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYob3BlbkJveFRpbWVvdXQpe1xyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQob3BlbkJveFRpbWVvdXQpXHJcbiAgICAgICAgICAgIG9wZW5Cb3hUaW1lb3V0ID0gbnVsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBQSVBFX0hPVkVSRUQocGlwZVJlZiwgZSkge1xyXG4gICAgICAgIGlmKCFzdGF0ZS5kcmFnZ2VkQ29tcG9uZW50U3RhdGVJZCl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBob3ZlcmVkUGlwZTogcGlwZVJlZn0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gQ09NUE9ORU5UX1ZJRVdfRFJBR0dFRChlKSB7XHJcbiAgICAgICAgY29uc3QgaW5pdGlhbFggPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0ucGFnZVggOiBlLnBhZ2VYXHJcbiAgICAgICAgY29uc3QgaW5pdGlhbFkgPSBlLnRvdWNoZXMgPyBlLnRvdWNoZXNbMF0ucGFnZVkgOiBlLnBhZ2VZXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLmVsbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxyXG4gICAgICAgIGNvbnN0IG9mZnNldFggPSBpbml0aWFsWCAtIHBvc2l0aW9uLmxlZnRcclxuICAgICAgICBjb25zdCBvZmZzZXRZID0gaW5pdGlhbFkgLSBwb3NpdGlvbi50b3BcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZHJhZyhlKSB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgICAgICBjb25zdCB4ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdLnBhZ2VYIDogZS5wYWdlWFxyXG4gICAgICAgICAgICBjb25zdCB5ID0gZS50b3VjaGVzID8gZS50b3VjaGVzWzBdLnBhZ2VZIDogZS5wYWdlWVxyXG4gICAgICAgICAgICBzZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICAuLi5zdGF0ZSxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudEVkaXRvclBvc2l0aW9uOiB7eDogeCAtIG9mZnNldFgsIHk6IHkgLSBvZmZzZXRZfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZylcclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZHJhZylcclxuICAgICAgICBmdW5jdGlvbiBzdG9wRHJhZ2dpbmcoZXZlbnQpIHtcclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKVxyXG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZylcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGRyYWcpXHJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc3RvcERyYWdnaW5nKVxyXG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBzdG9wRHJhZ2dpbmcpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc3RvcERyYWdnaW5nKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHN0b3BEcmFnZ2luZylcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIFdJRFRIX0RSQUdHRUQod2lkdGhOYW1lLCBlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgICAgZnVuY3Rpb24gcmVzaXplKGUpe1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICAgICAgLy8gVE9ETyByZWZhY3RvclxyXG4gICAgICAgICAgICBsZXQgbmV3V2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCAtIChlLnRvdWNoZXM/IGUudG91Y2hlc1swXS5wYWdlWDogZS5wYWdlWClcclxuICAgICAgICAgICAgaWYod2lkdGhOYW1lID09PSAnZWRpdG9yTGVmdFdpZHRoJyl7XHJcbiAgICAgICAgICAgICAgICBuZXdXaWR0aCA9IGUudG91Y2hlcz8gZS50b3VjaGVzWzBdLnBhZ2VYOiBlLnBhZ2VYXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYod2lkdGhOYW1lID09PSAnc3ViRWRpdG9yV2lkdGgnKXtcclxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gKGUudG91Y2hlcz8gZS50b3VjaGVzWzBdLnBhZ2VYOiBlLnBhZ2VYKSAtIHN0YXRlLmNvbXBvbmVudEVkaXRvclBvc2l0aW9uLnhcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih3aWR0aE5hbWUgPT09ICdzdWJFZGl0b3JXaWR0aExlZnQnKXtcclxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gc3RhdGUuY29tcG9uZW50RWRpdG9yUG9zaXRpb24ueCArIHN0YXRlLnN1YkVkaXRvcldpZHRoIC0gKGUudG91Y2hlcz8gZS50b3VjaGVzWzBdLnBhZ2VYOiBlLnBhZ2VYKVxyXG4gICAgICAgICAgICAgICAgaWYobmV3V2lkdGggPCAyNTApe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHsuLi5zdGF0ZSwgc3ViRWRpdG9yV2lkdGg6IG5ld1dpZHRoLCBjb21wb25lbnRFZGl0b3JQb3NpdGlvbjogey4uLnN0YXRlLmNvbXBvbmVudEVkaXRvclBvc2l0aW9uLCB4OiBlLnRvdWNoZXM/IGUudG91Y2hlc1swXS5wYWdlWDogZS5wYWdlWH19KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEkgcHJvYmFibHkgd2FzIGRydW5rXHJcbiAgICAgICAgICAgIGlmKHdpZHRoTmFtZSAhPT0gJ3N1YkVkaXRvcldpZHRoJyAmJiB3aWR0aE5hbWUgIT09ICdzdWJFZGl0b3JXaWR0aCcgJiYgKCAod2lkdGhOYW1lID09PSAnZWRpdG9yTGVmdFdpZHRoJyA/IHN0YXRlLmxlZnRPcGVuOiBzdGF0ZS5yaWdodE9wZW4pID8gbmV3V2lkdGggPCAxODA6IG5ld1dpZHRoID4gMTgwKSl7XHJcbiAgICAgICAgICAgICAgICBpZih3aWR0aE5hbWUgPT09ICdlZGl0b3JMZWZ0V2lkdGgnKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2V0U3RhdGUoey4uLnN0YXRlLCBsZWZ0T3BlbjogIXN0YXRlLmxlZnRPcGVufSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBzZXRTdGF0ZSh7Li4uc3RhdGUsIHJpZ2h0T3BlbjogIXN0YXRlLnJpZ2h0T3Blbn0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYobmV3V2lkdGggPCAyNTApe1xyXG4gICAgICAgICAgICAgICAgbmV3V2lkdGggPSAyNTBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIFt3aWR0aE5hbWVdOiBuZXdXaWR0aH0pXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgcmVzaXplKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCByZXNpemUpXHJcbiAgICAgICAgZnVuY3Rpb24gc3RvcERyYWdnaW5nKGUpe1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHJlc2l6ZSlcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHJlc2l6ZSlcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBzdG9wRHJhZ2dpbmcpXHJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHN0b3BEcmFnZ2luZylcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc3RvcERyYWdnaW5nKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHN0b3BEcmFnZ2luZylcclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBTVEFURV9EUkFHR0VEKHN0YXRlSWQsIGUpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICBjb25zdCBpbml0aWFsWCA9IGUudG91Y2hlcz8gZS50b3VjaGVzWzBdLnBhZ2VYOiBlLnBhZ2VYXHJcbiAgICAgICAgY29uc3QgaW5pdGlhbFkgPSBlLnRvdWNoZXM/IGUudG91Y2hlc1swXS5wYWdlWTogZS5wYWdlWVxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5lbG0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgICAgICBjb25zdCBvZmZzZXRYID0gaW5pdGlhbFggLSBwb3NpdGlvbi5sZWZ0XHJcbiAgICAgICAgY29uc3Qgb2Zmc2V0WSA9IGluaXRpYWxZIC0gcG9zaXRpb24udG9wXHJcbiAgICAgICAgZnVuY3Rpb24gZHJhZyhlKXtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgICAgICAgIGNvbnN0IHggPSBlLnRvdWNoZXM/IGUudG91Y2hlc1swXS5wYWdlWDogZS5wYWdlWFxyXG4gICAgICAgICAgICBjb25zdCB5ID0gZS50b3VjaGVzPyBlLnRvdWNoZXNbMF0ucGFnZVk6IGUucGFnZVlcclxuICAgICAgICAgICAgaWYoIXN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3KXtcclxuICAgICAgICAgICAgICAgIGlmKE1hdGguYWJzKGluaXRpYWxZLXkpID4gMyl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBkcmFnZ2VkQ29tcG9uZW50U3RhdGVJZDogc3RhdGVJZCwgbW91c2VQb3NpdGlvbjoge3g6IHggLSBvZmZzZXRYLCB5OiB5IC0gb2Zmc2V0WX19KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBtb3VzZVBvc2l0aW9uOiB7eDogeCAtIG9mZnNldFgsIHk6IHkgLSBvZmZzZXRZfX0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBkcmFnKVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0b3BEcmFnZ2luZyhldmVudCl7XHJcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcpXHJcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBkcmFnKVxyXG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHN0b3BEcmFnZ2luZylcclxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgc3RvcERyYWdnaW5nKVxyXG4gICAgICAgICAgICBpZighc3RhdGUuZHJhZ2dlZENvbXBvbmVudFN0YXRlSWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBTVEFURV9OT0RFX1NFTEVDVEVEKHN0YXRlSWQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoIXN0YXRlLmhvdmVyZWRQaXBlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdnZWRDb21wb25lbnRTdGF0ZUlkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyZWRQaXBlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBqb2luSWRTdGF0ZSA9IHV1aWQoKVxyXG4gICAgICAgICAgICBjb25zdCBqb2luSWRUZXh0ID0gdXVpZCgpXHJcbiAgICAgICAgICAgIGNvbnN0IHBpcGVJZFN0YXRlID0gdXVpZCgpXHJcbiAgICAgICAgICAgIGNvbnN0IHBpcGVJZFRleHQgPSB1dWlkKClcclxuICAgICAgICAgICAgc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUsXHJcbiAgICAgICAgICAgICAgICBkcmFnZ2VkQ29tcG9uZW50U3RhdGVJZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIGhvdmVyZWRQaXBlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbiA6IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHBpcGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBbc3RhdGUuaG92ZXJlZFBpcGUuaWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGVbc3RhdGUuaG92ZXJlZFBpcGUuaWRdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbe3JlZjogJ2pvaW4nLCBpZDogam9pbklkU3RhdGV9LCB7cmVmOiAnam9pbicsIGlkOiBqb2luSWRUZXh0fV0uY29uY2F0KHN0YXRlLmRlZmluaXRpb24ucGlwZVtzdGF0ZS5ob3ZlcmVkUGlwZS5pZF0udHJhbnNmb3JtYXRpb25zKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBbcGlwZUlkU3RhdGVdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge3JlZjogJ3N0YXRlJywgaWQ6c3RhdGUuZHJhZ2dlZENvbXBvbmVudFN0YXRlSWR9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZjogJ3RvVGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdub29wJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW3BpcGVJZFRleHRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1hdGlvbnM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBqb2luOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24uam9pbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgW2pvaW5JZFN0YXRlXToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtyZWY6ICdwaXBlJywgaWQ6IHBpcGVJZFN0YXRlfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBbam9pbklkVGV4dF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7cmVmOiAncGlwZScsIGlkOiBwaXBlSWRUZXh0fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgc3RvcERyYWdnaW5nKVxyXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHN0b3BEcmFnZ2luZylcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIE9QRU5fU0lERUJBUihzaWRlKSB7XHJcbiAgICAgICAgaWYoc2lkZSA9PT0gJ2xlZnQnKXtcclxuICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHsuLi5zdGF0ZSwgbGVmdE9wZW46ICFzdGF0ZS5sZWZ0T3Blbn0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHNpZGUgPT09ICdyaWdodCcpe1xyXG4gICAgICAgICAgICByZXR1cm4gc2V0U3RhdGUoey4uLnN0YXRlLCByaWdodE9wZW46ICFzdGF0ZS5yaWdodE9wZW59KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIEZSRUVaRVJfQ0xJQ0tFRCgpIHtcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGFwcElzRnJvemVuOiAhc3RhdGUuYXBwSXNGcm96ZW59KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gVklFV19GT0xERVJfQ0xJQ0tFRChub2RlSWQsIGZvcmNlZFZhbHVlKSB7XHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCB2aWV3Rm9sZGVyc0Nsb3NlZDp7Li4uc3RhdGUudmlld0ZvbGRlcnNDbG9zZWQsIFtub2RlSWRdOiBmb3JjZWRWYWx1ZSAhPT0gdW5kZWZpbmVkID8gZm9yY2VkVmFsdWUgOiAhc3RhdGUudmlld0ZvbGRlcnNDbG9zZWRbbm9kZUlkXX19KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gVklFV19OT0RFX1NFTEVDVEVEKHJlZikge1xyXG4gICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgc2VsZWN0ZWRWaWV3Tm9kZTpyZWZ9KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gVU5TRUxFQ1RfVklFV19OT0RFKHNlbGZPbmx5LCBzdG9wUHJvcGFnYXRpb24sIGUpIHtcclxuICAgICAgICBpZihzdG9wUHJvcGFnYXRpb24pe1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHNlbGZPbmx5ICYmIGUudGFyZ2V0ICE9PSB0aGlzLmVsbSl7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIHNlbGVjdGVkVmlld05vZGU6e319KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gU1RBVEVfTk9ERV9TRUxFQ1RFRChub2RlSWQpIHtcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIHNlbGVjdGVkU3RhdGVOb2RlSWQ6bm9kZUlkfSlcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIFVOU0VMRUNUX1NUQVRFX05PREUoZSkge1xyXG4gICAgICAgIGlmKGUudGFyZ2V0ID09PSB0aGlzLmVsbSl7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgc2VsZWN0ZWRTdGF0ZU5vZGVJZDonJ30pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gQUREX05PREUobm9kZVJlZiwgdHlwZSkge1xyXG4gICAgICAgIGlmKCFub2RlUmVmLnJlZiB8fCAhc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl1bbm9kZVJlZi5pZF0gfHwgIXN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdW25vZGVSZWYuaWRdLmNoaWxkcmVuKXtcclxuICAgICAgICAgICAgaWYoc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCAmJiBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLmlkICE9PSAnX3Jvb3ROb2RlJyl7XHJcbiAgICAgICAgICAgICAgICBub2RlUmVmID0gc3RhdGUuZGVmaW5pdGlvbltzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZl1bc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZF0ucGFyZW50XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBub2RlUmVmID0ge3JlZjogJ3ZOb2RlQm94JywgaWQ6ICdfcm9vdE5vZGUnfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG5vZGVJZCA9IG5vZGVSZWYuaWRcclxuICAgICAgICBjb25zdCBuZXdOb2RlSWQgPSB1dWlkKClcclxuICAgICAgICBjb25zdCBuZXdTdHlsZUlkID0gdXVpZCgpXHJcbiAgICAgICAgY29uc3QgbmV3U3R5bGUgPSB7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdib3gnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld05vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ2JveCcsXHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGVSZWYsXHJcbiAgICAgICAgICAgICAgICBzdHlsZToge3JlZjonc3R5bGUnLCBpZDpuZXdTdHlsZUlkfSxcclxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gc2V0U3RhdGUoe1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUsXHJcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFZpZXdOb2RlOiB7cmVmOid2Tm9kZUJveCcsIGlkOiBuZXdOb2RlSWR9LFxyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbm9kZVJlZi5yZWYgPT09ICd2Tm9kZUJveCcgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgICAgICB2Tm9kZUJveDogey4uLnN0YXRlLmRlZmluaXRpb24udk5vZGVCb3gsIFtub2RlSWRdOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi52Tm9kZUJveFtub2RlSWRdLCBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbi52Tm9kZUJveFtub2RlSWRdLmNoaWxkcmVuLmNvbmNhdCh7cmVmOid2Tm9kZUJveCcsIGlkOm5ld05vZGVJZH0pfSwgW25ld05vZGVJZF06IG5ld05vZGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5zdHlsZSwgW25ld1N0eWxlSWRdOiBuZXdTdHlsZX0sXHJcbiAgICAgICAgICAgICAgICB9IDoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgW25vZGVSZWYucmVmXTogey4uLnN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdLCBbbm9kZUlkXTogey4uLnN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdW25vZGVJZF0sIGNoaWxkcmVuOiBzdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlSWRdLmNoaWxkcmVuLmNvbmNhdCh7cmVmOid2Tm9kZUJveCcsIGlkOm5ld05vZGVJZH0pfX0sXHJcbiAgICAgICAgICAgICAgICAgICAgdk5vZGVCb3g6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnZOb2RlQm94LCBbbmV3Tm9kZUlkXTogbmV3Tm9kZX0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnN0eWxlLCBbbmV3U3R5bGVJZF06IG5ld1N0eWxlfSxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ3RleHQnKXtcclxuICAgICAgICAgICAgY29uc3QgcGlwZUlkID0gdXVpZCgpXHJcbiAgICAgICAgICAgIGNvbnN0IG5ld05vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgcGFyZW50OiBub2RlUmVmLFxyXG4gICAgICAgICAgICAgICAgc3R5bGU6IHtyZWY6J3N0eWxlJywgaWQ6bmV3U3R5bGVJZH0sXHJcbiAgICAgICAgICAgICAgICB2YWx1ZToge3JlZjoncGlwZScsIGlkOnBpcGVJZH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBuZXdQaXBlID0ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdEZWZhdWx0IFRleHQnLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBzZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICAuLi5zdGF0ZSxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkVmlld05vZGU6IHtyZWY6J3ZOb2RlVGV4dCcsIGlkOiBuZXdOb2RlSWR9LFxyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwZTogey4uLnN0YXRlLmRlZmluaXRpb24ucGlwZSwgW3BpcGVJZF06IG5ld1BpcGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIFtub2RlUmVmLnJlZl06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXSwgW25vZGVJZF06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlSWRdLCBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl1bbm9kZUlkXS5jaGlsZHJlbi5jb25jYXQoe3JlZjondk5vZGVUZXh0JywgaWQ6bmV3Tm9kZUlkfSl9fSxcclxuICAgICAgICAgICAgICAgICAgICB2Tm9kZVRleHQ6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnZOb2RlVGV4dCwgW25ld05vZGVJZF06IG5ld05vZGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5zdHlsZSwgW25ld1N0eWxlSWRdOiBuZXdTdHlsZX0sXHJcbiAgICAgICAgICAgICAgICB9fSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ2ltYWdlJyl7XHJcbiAgICAgICAgICAgIGNvbnN0IHBpcGVJZCA9IHV1aWQoKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdOb2RlID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdpbWFnZScsXHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGVSZWYsXHJcbiAgICAgICAgICAgICAgICBzdHlsZToge3JlZjonc3R5bGUnLCBpZDpuZXdTdHlsZUlkfSxcclxuICAgICAgICAgICAgICAgIHNyYzoge3JlZjoncGlwZScsIGlkOnBpcGVJZH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBuZXdQaXBlID0ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdodHRwczovL3d3dy51Z25pcy5jb20vaW1hZ2VzL2xvZ28yNTZ4MjU2LnBuZycsXHJcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm1hdGlvbnM6IFtdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgIC4uLnN0YXRlLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRWaWV3Tm9kZToge3JlZjondk5vZGVJbWFnZScsIGlkOiBuZXdOb2RlSWR9LFxyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwZTogey4uLnN0YXRlLmRlZmluaXRpb24ucGlwZSwgW3BpcGVJZF06IG5ld1BpcGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIFtub2RlUmVmLnJlZl06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXSwgW25vZGVJZF06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlSWRdLCBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl1bbm9kZUlkXS5jaGlsZHJlbi5jb25jYXQoe3JlZjondk5vZGVJbWFnZScsIGlkOm5ld05vZGVJZH0pfX0sXHJcbiAgICAgICAgICAgICAgICAgICAgdk5vZGVJbWFnZTogey4uLnN0YXRlLmRlZmluaXRpb24udk5vZGVJbWFnZSwgW25ld05vZGVJZF06IG5ld05vZGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5zdHlsZSwgW25ld1N0eWxlSWRdOiBuZXdTdHlsZX0sXHJcbiAgICAgICAgICAgICAgICB9fSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ2lmJyl7XHJcbiAgICAgICAgICAgIGNvbnN0IHBpcGVJZCA9IHV1aWQoKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdOb2RlID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdjb25kaXRpb25hbCcsXHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGVSZWYsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZToge3JlZjoncGlwZScsIGlkOnBpcGVJZH0sXHJcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbmV3UGlwZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBzZXRTdGF0ZSh7XHJcbiAgICAgICAgICAgICAgICAuLi5zdGF0ZSxcclxuICAgICAgICAgICAgICAgIHNlbGVjdGVkVmlld05vZGU6IHtyZWY6J3ZOb2RlSWYnLCBpZDogbmV3Tm9kZUlkfSxcclxuICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG5vZGVSZWYucmVmID09PSAndk5vZGVJZicgPyB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBwaXBlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLCBbcGlwZUlkXTogbmV3UGlwZX0sXHJcbiAgICAgICAgICAgICAgICAgICAgdk5vZGVJZjogey4uLnN0YXRlLmRlZmluaXRpb24udk5vZGVJZiwgW25vZGVJZF06IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnZOb2RlSWZbbm9kZUlkXSwgY2hpbGRyZW46IHN0YXRlLmRlZmluaXRpb24udk5vZGVJZltub2RlSWRdLmNoaWxkcmVuLmNvbmNhdCh7cmVmOid2Tm9kZUlmJywgaWQ6bmV3Tm9kZUlkfSl9LCBbbmV3Tm9kZUlkXTogbmV3Tm9kZX0sXHJcbiAgICAgICAgICAgICAgICB9IDoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwZTogey4uLnN0YXRlLmRlZmluaXRpb24ucGlwZSwgW3BpcGVJZF06IG5ld1BpcGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIFtub2RlUmVmLnJlZl06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXSwgW25vZGVJZF06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlSWRdLCBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl1bbm9kZUlkXS5jaGlsZHJlbi5jb25jYXQoe3JlZjondk5vZGVJZicsIGlkOm5ld05vZGVJZH0pfX0sXHJcbiAgICAgICAgICAgICAgICAgICAgdk5vZGVJZjogey4uLnN0YXRlLmRlZmluaXRpb24udk5vZGVJZiwgW25ld05vZGVJZF06IG5ld05vZGV9LFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0eXBlID09PSAnaW5wdXQnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXRlSWQgPSB1dWlkKClcclxuICAgICAgICAgICAgY29uc3QgZXZlbnRJZCA9IHV1aWQoKVxyXG4gICAgICAgICAgICBjb25zdCBtdXRhdG9ySWQgPSB1dWlkKClcclxuICAgICAgICAgICAgY29uc3QgcGlwZUlucHV0SWQgPSB1dWlkKClcclxuICAgICAgICAgICAgY29uc3QgcGlwZU11dGF0b3JJZCA9IHV1aWQoKVxyXG4gICAgICAgICAgICBjb25zdCBuZXdOb2RlID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdpbnB1dCcsXHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGVSZWYsXHJcbiAgICAgICAgICAgICAgICBzdHlsZToge3JlZjonc3R5bGUnLCBpZDpuZXdTdHlsZUlkfSxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB7cmVmOidwaXBlJywgaWQ6cGlwZUlucHV0SWR9LFxyXG4gICAgICAgICAgICAgICAgaW5wdXQ6IHtyZWY6J2V2ZW50JywgaWQ6ZXZlbnRJZH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBuZXdQaXBlSW5wdXQgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZToge3JlZjogJ3N0YXRlJywgaWQ6IHN0YXRlSWR9LFxyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld1BpcGVNdXRhdG9yID0ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHtyZWY6ICdldmVudERhdGEnLCBpZDogJ19pbnB1dCd9LFxyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICdpbnB1dCB2YWx1ZScsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICByZWY6IHN0YXRlSWQsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWU6ICdEZWZhdWx0IHRleHQnLFxyXG4gICAgICAgICAgICAgICAgbXV0YXRvcnM6IFt7IHJlZjonbXV0YXRvcicsIGlkOm11dGF0b3JJZH1dLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld011dGF0b3IgPSB7XHJcbiAgICAgICAgICAgICAgICBldmVudDogeyByZWY6ICdldmVudCcsIGlkOmV2ZW50SWR9LFxyXG4gICAgICAgICAgICAgICAgc3RhdGU6IHsgcmVmOiAnc3RhdGUnLCBpZDpzdGF0ZUlkfSxcclxuICAgICAgICAgICAgICAgIG11dGF0aW9uOiB7IHJlZjogJ3BpcGUnLCBpZDogcGlwZU11dGF0b3JJZH0sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbmV3RXZlbnQgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnaW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICd1cGRhdGUgaW5wdXQnLFxyXG4gICAgICAgICAgICAgICAgbXV0YXRvcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICB7IHJlZjogJ211dGF0b3InLCBpZDogbXV0YXRvcklkfSxcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICBlbWl0dGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVmOiAndk5vZGVJbnB1dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG5ld05vZGVJZCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBkYXRhOiBbXHJcbiAgICAgICAgICAgICAgICAgICAge3JlZjogJ2V2ZW50RGF0YScsIGlkOiAnX2lucHV0J31cclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHtcclxuICAgICAgICAgICAgICAgIC4uLnN0YXRlLFxyXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRWaWV3Tm9kZToge3JlZjondk5vZGVJbnB1dCcsIGlkOiBuZXdOb2RlSWR9LFxyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgcGlwZTogey4uLnN0YXRlLmRlZmluaXRpb24ucGlwZSwgW3BpcGVJbnB1dElkXTogbmV3UGlwZUlucHV0LCBbcGlwZU11dGF0b3JJZF06IG5ld1BpcGVNdXRhdG9yfSxcclxuICAgICAgICAgICAgICAgICAgICBbbm9kZVJlZi5yZWZdOiB7Li4uc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl0sIFtub2RlSWRdOiB7Li4uc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl1bbm9kZUlkXSwgY2hpbGRyZW46IHN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdW25vZGVJZF0uY2hpbGRyZW4uY29uY2F0KHtyZWY6J3ZOb2RlSW5wdXQnLCBpZDpuZXdOb2RlSWR9KX19LFxyXG4gICAgICAgICAgICAgICAgICAgIHZOb2RlSW5wdXQ6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnZOb2RlSW5wdXQsIFtuZXdOb2RlSWRdOiBuZXdOb2RlfSxcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZTogey4uLnN0YXRlLmRlZmluaXRpb24uc3R5bGUsIFtuZXdTdHlsZUlkXTogbmV3U3R5bGV9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVTcGFjZTogey4uLnN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlLCBbJ19yb290TmFtZVNwYWNlJ106IHsuLi5zdGF0ZS5kZWZpbml0aW9uLm5hbWVTcGFjZVsnX3Jvb3ROYW1lU3BhY2UnXSwgY2hpbGRyZW46IHN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlWydfcm9vdE5hbWVTcGFjZSddLmNoaWxkcmVuLmNvbmNhdCh7cmVmOidzdGF0ZScsIGlkOnN0YXRlSWR9KX19LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5zdGF0ZSwgW3N0YXRlSWRdOiBuZXdTdGF0ZX0sXHJcbiAgICAgICAgICAgICAgICAgICAgbXV0YXRvcjogey4uLnN0YXRlLmRlZmluaXRpb24ubXV0YXRvciwgW211dGF0b3JJZF06IG5ld011dGF0b3J9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50OiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5ldmVudCwgW2V2ZW50SWRdOiBuZXdFdmVudH0sXHJcbiAgICAgICAgICAgICAgICB9fSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBBRERfU1RBVEUobmFtZXNwYWNlSWQsIHR5cGUpIHtcclxuICAgICAgICBjb25zdCBuZXdTdGF0ZUlkID0gdXVpZCgpXHJcbiAgICAgICAgbGV0IG5ld1N0YXRlXHJcbiAgICAgICAgaWYodHlwZSA9PT0gJ3RleHQnKSB7XHJcbiAgICAgICAgICAgIG5ld1N0YXRlID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICduZXcgdGV4dCcsXHJcbiAgICAgICAgICAgICAgICByZWY6IG5ld1N0YXRlSWQsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWU6ICdEZWZhdWx0IHRleHQnLFxyXG4gICAgICAgICAgICAgICAgbXV0YXRvcnM6IFtdLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdudW1iZXInKSB7XHJcbiAgICAgICAgICAgIG5ld1N0YXRlID0ge1xyXG4gICAgICAgICAgICAgICAgdGl0bGU6ICduZXcgbnVtYmVyJyxcclxuICAgICAgICAgICAgICAgIHJlZjogbmV3U3RhdGVJZCxcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiAwLFxyXG4gICAgICAgICAgICAgICAgbXV0YXRvcnM6IFtdLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdib29sZWFuJykge1xyXG4gICAgICAgICAgICBuZXdTdGF0ZSA9IHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiAnbmV3IGJvb2xlYW4nLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICAgICAgcmVmOiBuZXdTdGF0ZUlkLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbXV0YXRvcnM6IFtdLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICd0YWJsZScpIHtcclxuICAgICAgICAgICAgbmV3U3RhdGUgPSB7XHJcbiAgICAgICAgICAgICAgICB0aXRsZTogJ25ldyB0YWJsZScsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAndGFibGUnLFxyXG4gICAgICAgICAgICAgICAgcmVmOiBuZXdTdGF0ZUlkLFxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiB7fSxcclxuICAgICAgICAgICAgICAgIG11dGF0b3JzOiBbXSxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0eXBlID09PSAnZm9sZGVyJykge1xyXG4gICAgICAgICAgICBuZXdTdGF0ZSA9IHtcclxuICAgICAgICAgICAgICAgIHRpdGxlOiAnbmV3IGZvbGRlcicsXHJcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgIG5hbWVTcGFjZTogey4uLnN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlLCBbbmFtZXNwYWNlSWRdOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5uYW1lU3BhY2VbbmFtZXNwYWNlSWRdLCBjaGlsZHJlbjogc3RhdGUuZGVmaW5pdGlvbi5uYW1lU3BhY2VbbmFtZXNwYWNlSWRdLmNoaWxkcmVuLmNvbmNhdCh7cmVmOiduYW1lU3BhY2UnLCBpZDpuZXdTdGF0ZUlkfSl9LCBbbmV3U3RhdGVJZF06IG5ld1N0YXRlfSxcclxuICAgICAgICAgICAgfX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICBuYW1lU3BhY2U6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLm5hbWVTcGFjZSwgW25hbWVzcGFjZUlkXTogey4uLnN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlW25hbWVzcGFjZUlkXSwgY2hpbGRyZW46IHN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlW25hbWVzcGFjZUlkXS5jaGlsZHJlbi5jb25jYXQoe3JlZjonc3RhdGUnLCBpZDpuZXdTdGF0ZUlkfSl9fSxcclxuICAgICAgICAgICAgc3RhdGU6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnN0YXRlLCBbbmV3U3RhdGVJZF06IG5ld1N0YXRlfSxcclxuICAgICAgICB9fSlcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIEFERF9ERUZBVUxUX1NUWUxFKHN0eWxlSWQsIGtleSkge1xyXG4gICAgICAgIGNvbnN0IHBpcGVJZCA9IHV1aWQoKVxyXG4gICAgICAgIGNvbnN0IGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAnYmFja2dyb3VuZCc6ICd3aGl0ZScsXHJcbiAgICAgICAgICAgICdib3JkZXInOiAnMXB4IHNvbGlkIGJsYWNrJyxcclxuICAgICAgICAgICAgJ291dGxpbmUnOiAnMXB4IHNvbGlkIGJsYWNrJyxcclxuICAgICAgICAgICAgJ2N1cnNvcic6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgJ2NvbG9yJzogJ2JsYWNrJyxcclxuICAgICAgICAgICAgJ2Rpc3BsYXknOiAnYmxvY2snLFxyXG4gICAgICAgICAgICAndG9wJzogJzBweCcsXHJcbiAgICAgICAgICAgICdib3R0b20nOiAnMHB4JyxcclxuICAgICAgICAgICAgJ2xlZnQnOiAnMHB4JyxcclxuICAgICAgICAgICAgJ3JpZ2h0JzogJzBweCcsXHJcbiAgICAgICAgICAgICdmbGV4JzogJzEgMSBhdXRvJyxcclxuICAgICAgICAgICAgJ2p1c3RpZnlDb250ZW50JzogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICdhbGlnbkl0ZW1zJzogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICdtYXhXaWR0aCc6ICcxMDAlJyxcclxuICAgICAgICAgICAgJ21heEhlaWdodCc6ICcxMDAlJyxcclxuICAgICAgICAgICAgJ21pbldpZHRoJzogJzEwMCUnLFxyXG4gICAgICAgICAgICAnbWluSGVpZ2h0JzogJzEwMCUnLFxyXG4gICAgICAgICAgICAncG9zaXRpb24nOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAnb3ZlcmZsb3cnOiAnYXV0bycsXHJcbiAgICAgICAgICAgICdoZWlnaHQnOiAnNTAwcHgnLFxyXG4gICAgICAgICAgICAnd2lkdGgnOiAnNTAwcHgnLFxyXG4gICAgICAgICAgICAnZm9udCc6ICdpdGFsaWMgMmVtIFwiQ29taWMgU2FucyBNU1wiLCBjdXJzaXZlLCBzYW5zLXNlcmlmJyxcclxuICAgICAgICAgICAgJ21hcmdpbic6ICcxMHB4JyxcclxuICAgICAgICAgICAgJ3BhZGRpbmcnOiAnMTBweCcsXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICBwaXBlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLCBbcGlwZUlkXToge3R5cGU6ICd0ZXh0JywgdmFsdWU6IGRlZmF1bHRzW2tleV0sIHRyYW5zZm9ybWF0aW9uczpbXX19LFxyXG4gICAgICAgICAgICBzdHlsZTogey4uLnN0YXRlLmRlZmluaXRpb24uc3R5bGUsIFtzdHlsZUlkXTogey4uLnN0YXRlLmRlZmluaXRpb24uc3R5bGVbc3R5bGVJZF0sIFtrZXldOiB7cmVmOiAncGlwZScsIGlkOiBwaXBlSWR9fX19fSlcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIFNFTEVDVF9WSUVXX1NVQk1FTlUobmV3SWQpIHtcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIHNlbGVjdGVkVmlld1N1Yk1lbnU6bmV3SWR9KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gRURJVF9WSUVXX05PREVfVElUTEUobm9kZUlkKSB7XHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBlZGl0aW5nVGl0bGVOb2RlSWQ6bm9kZUlkfSlcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIERFTEVURV9TRUxFQ1RFRF9WSUVXKG5vZGVSZWYsIHBhcmVudFJlZikge1xyXG4gICAgICAgIGlmKG5vZGVSZWYuaWQgPT09ICdfcm9vdE5vZGUnKXtcclxuICAgICAgICAgICAgaWYoc3RhdGUuZGVmaW5pdGlvbi52Tm9kZUJveFsnX3Jvb3ROb2RlJ10uY2hpbGRyZW4ubGVuZ3RoID09PSAwKXtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpbW11dGFibHkgcmVtb3ZlIGFsbCBub2RlcyBleGNlcHQgcm9vdE5vZGVcclxuICAgICAgICAgICAgcmV0dXJuIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgIHZOb2RlQm94OiB7J19yb290Tm9kZSc6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnZOb2RlQm94Wydfcm9vdE5vZGUnXSwgY2hpbGRyZW46IFtdfX0sXHJcbiAgICAgICAgICAgIH0sIHNlbGVjdGVkVmlld05vZGU6IHt9fSlcclxuICAgICAgICB9XHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBkZWZpbml0aW9uOiB7XHJcbiAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgIFtwYXJlbnRSZWYucmVmXTogey4uLnN0YXRlLmRlZmluaXRpb25bcGFyZW50UmVmLnJlZl0sIFtwYXJlbnRSZWYuaWRdOiB7Li4uc3RhdGUuZGVmaW5pdGlvbltwYXJlbnRSZWYucmVmXVtwYXJlbnRSZWYuaWRdLCBjaGlsZHJlbjpzdGF0ZS5kZWZpbml0aW9uW3BhcmVudFJlZi5yZWZdW3BhcmVudFJlZi5pZF0uY2hpbGRyZW4uZmlsdGVyKChyZWYpPT5yZWYuaWQgIT09IG5vZGVSZWYuaWQpfX0sXHJcbiAgICAgICAgfSwgc2VsZWN0ZWRWaWV3Tm9kZToge319KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gQ0hBTkdFX1ZJRVdfTk9ERV9USVRMRShub2RlUmVmLCBlKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGNvbnN0IG5vZGVJZCA9IG5vZGVSZWYuaWRcclxuICAgICAgICBjb25zdCBub2RlVHlwZSA9IG5vZGVSZWYucmVmXHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBkZWZpbml0aW9uOiB7XHJcbiAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgIFtub2RlVHlwZV06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVUeXBlXSwgW25vZGVJZF06IHsuLi5zdGF0ZS5kZWZpbml0aW9uW25vZGVUeXBlXVtub2RlSWRdLCB0aXRsZTogZS50YXJnZXQudmFsdWV9fSxcclxuICAgICAgICB9fSlcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIENIQU5HRV9TVEFURV9OT0RFX1RJVExFKG5vZGVJZCwgZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246IHtcclxuICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgc3RhdGU6IHsuLi5zdGF0ZS5kZWZpbml0aW9uLnN0YXRlLCBbbm9kZUlkXTogey4uLnN0YXRlLmRlZmluaXRpb24uc3RhdGVbbm9kZUlkXSwgdGl0bGU6IGUudGFyZ2V0LnZhbHVlfX0sXHJcbiAgICAgICAgfX0pXHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBDSEFOR0VfTkFNRVNQQUNFX1RJVExFKG5vZGVJZCwgZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246IHtcclxuICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgbmFtZVNwYWNlOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5uYW1lU3BhY2UsIFtub2RlSWRdOiB7Li4uc3RhdGUuZGVmaW5pdGlvbi5uYW1lU3BhY2Vbbm9kZUlkXSwgdGl0bGU6IGUudGFyZ2V0LnZhbHVlfX0sXHJcbiAgICAgICAgfX0pXHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBDSEFOR0VfQ1VSUkVOVF9TVEFURV9URVhUX1ZBTFVFKHN0YXRlSWQsIGUpIHtcclxuICAgICAgICBhcHAuc2V0Q3VycmVudFN0YXRlKHsuLi5hcHAuZ2V0Q3VycmVudFN0YXRlKCksIFtzdGF0ZUlkXTogZS50YXJnZXQudmFsdWV9KVxyXG4gICAgICAgIHJlbmRlcigpXHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBDSEFOR0VfQ1VSUkVOVF9TVEFURV9OVU1CRVJfVkFMVUUoc3RhdGVJZCwgZSkge1xyXG4gICAgICAgIC8vIHRvZG8gYmlnIHRocm93cyBlcnJvciBpbnN0ZWFkIG9mIHJldHVybmluZyBOYU4uLi4gZml4LCByZXdyaXRlIG9yIGhhY2tcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZihiaWcoZS50YXJnZXQudmFsdWUpLnRvU3RyaW5nKCkgIT09IGFwcC5nZXRDdXJyZW50U3RhdGUoKVtzdGF0ZUlkXS50b1N0cmluZygpKXtcclxuICAgICAgICAgICAgICAgIGFwcC5zZXRDdXJyZW50U3RhdGUoey4uLmFwcC5nZXRDdXJyZW50U3RhdGUoKSwgW3N0YXRlSWRdOiBiaWcoZS50YXJnZXQudmFsdWUpfSlcclxuICAgICAgICAgICAgICAgIHJlbmRlcigpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoKGVycikge1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIENIQU5HRV9TVEFUSUNfVkFMVUUocmVmLCBwcm9wZXJ0eU5hbWUsIHR5cGUsIGUpIHtcclxuICAgICAgICBsZXQgdmFsdWUgPSBlLnRhcmdldC52YWx1ZVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdudW1iZXInKXtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gYmlnKGUudGFyZ2V0LnZhbHVlKVxyXG4gICAgICAgICAgICB9IGNhdGNoKGVycikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHR5cGUgPT09ICdib29sZWFuJyl7XHJcbiAgICAgICAgICAgIHZhbHVlID0gKHZhbHVlID09PSB0cnVlIHx8IHZhbHVlID09PSAndHJ1ZScpID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjp7XHJcbiAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgIFtyZWYucmVmXToge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbltyZWYucmVmXSxcclxuICAgICAgICAgICAgICAgIFtyZWYuaWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbltyZWYucmVmXVtyZWYuaWRdLFxyXG4gICAgICAgICAgICAgICAgICAgIFtwcm9wZXJ0eU5hbWVdOiB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfX0pXHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBBRERfRVZFTlQocHJvcGVydHlOYW1lLCBub2RlKSB7XHJcbiAgICAgICAgY29uc3QgcmVmID0gc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZVxyXG4gICAgICAgIGNvbnN0IGV2ZW50SWQgPSB1dWlkKCk7XHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBkZWZpbml0aW9uOntcclxuICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgW3JlZi5yZWZdOiB7XHJcbiAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uW3JlZi5yZWZdLFxyXG4gICAgICAgICAgICAgICAgW3JlZi5pZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uW3JlZi5yZWZdW3JlZi5pZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgW3Byb3BlcnR5TmFtZV06IHtyZWY6ICdldmVudCcsIGlkOiBldmVudElkfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBldmVudDoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5ldmVudCxcclxuICAgICAgICAgICAgICAgIFtldmVudElkXToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHByb3BlcnR5TmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyOiBub2RlLFxyXG4gICAgICAgICAgICAgICAgICAgIG11dGF0b3JzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBbXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfX0pXHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBTRUxFQ1RfUElQRShwaXBlSWQsIGUpIHtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBzZWxlY3RlZFBpcGVJZDpwaXBlSWR9KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gQ0hBTkdFX1BJUEVfVkFMVUVfVE9fU1RBVEUocGlwZUlkKSB7XHJcbiAgICAgICAgaWYoIXN0YXRlLnNlbGVjdGVkU3RhdGVOb2RlSWQgfHwgc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCA9PT0gc3RhdGUuZGVmaW5pdGlvbi5waXBlW3BpcGVJZF0udmFsdWUuaWQgKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246IHtcclxuICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgcGlwZToge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLFxyXG4gICAgICAgICAgICAgICAgW3BpcGVJZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge3JlZjogJ3N0YXRlJywgaWQ6IHN0YXRlLnNlbGVjdGVkU3RhdGVOb2RlSWR9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybWF0aW9uczogW11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH19KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gQUREX1RSQU5TRk9STUFUSU9OKHBpcGVJZCwgdHJhbnNmb3JtYXRpb24pIHtcclxuICAgICAgICBpZih0cmFuc2Zvcm1hdGlvbiA9PT0gJ2pvaW4nKXtcclxuICAgICAgICAgICAgY29uc3QgbmV3UGlwZUlkID0gdXVpZCgpO1xyXG4gICAgICAgICAgICBjb25zdCBqb2luSWQgPSB1dWlkKCk7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgIGpvaW46IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLmpvaW4sXHJcbiAgICAgICAgICAgICAgICAgICAgW2pvaW5JZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtyZWY6ICdwaXBlJywgaWQ6bmV3UGlwZUlkfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwaXBlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIFtuZXdQaXBlSWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdEZWZhdWx0IHRleHQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1hdGlvbnM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBbcGlwZUlkXToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBzdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXS50cmFuc2Zvcm1hdGlvbnMuY29uY2F0KHtyZWY6ICdqb2luJywgaWQ6am9pbklkfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH19KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0cmFuc2Zvcm1hdGlvbiA9PT0gJ3RvVXBwZXJDYXNlJyl7XHJcbiAgICAgICAgICAgIGNvbnN0IG5ld0lkID0gdXVpZCgpO1xyXG4gICAgICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246IHtcclxuICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24sXHJcbiAgICAgICAgICAgICAgICB0b1VwcGVyQ2FzZToge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24udG9VcHBlckNhc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgW25ld0lkXToge31cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwaXBlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIFtwaXBlSWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24ucGlwZVtwaXBlSWRdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1hdGlvbnM6IHN0YXRlLmRlZmluaXRpb24ucGlwZVtwaXBlSWRdLnRyYW5zZm9ybWF0aW9ucy5jb25jYXQoe3JlZjogJ3RvVXBwZXJDYXNlJywgaWQ6bmV3SWR9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHRyYW5zZm9ybWF0aW9uID09PSAndG9Mb3dlckNhc2UnKXtcclxuICAgICAgICAgICAgY29uc3QgbmV3SWQgPSB1dWlkKCk7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgIHRvTG93ZXJDYXNlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi50b0xvd2VyQ2FzZSxcclxuICAgICAgICAgICAgICAgICAgICBbbmV3SWRdOiB7fVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHBpcGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGUsXHJcbiAgICAgICAgICAgICAgICAgICAgW3BpcGVJZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlW3BpcGVJZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybWF0aW9uczogc3RhdGUuZGVmaW5pdGlvbi5waXBlW3BpcGVJZF0udHJhbnNmb3JtYXRpb25zLmNvbmNhdCh7cmVmOiAndG9Mb3dlckNhc2UnLCBpZDpuZXdJZH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9fSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHJhbnNmb3JtYXRpb24gPT09ICd0b1RleHQnKXtcclxuICAgICAgICAgICAgY29uc3QgbmV3SWQgPSB1dWlkKCk7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgIHRvVGV4dDoge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24udG9UZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgIFtuZXdJZF06IHt9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcGlwZToge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24ucGlwZSxcclxuICAgICAgICAgICAgICAgICAgICBbcGlwZUlkXToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBzdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXS50cmFuc2Zvcm1hdGlvbnMuY29uY2F0KHtyZWY6ICd0b1RleHQnLCBpZDpuZXdJZH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9fSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHJhbnNmb3JtYXRpb24gPT09ICdhZGQnKXtcclxuICAgICAgICAgICAgY29uc3QgbmV3UGlwZUlkID0gdXVpZCgpO1xyXG4gICAgICAgICAgICBjb25zdCBhZGRJZCA9IHV1aWQoKTtcclxuICAgICAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBkZWZpbml0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICAgICAgYWRkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5hZGQsXHJcbiAgICAgICAgICAgICAgICAgICAgW2FkZElkXToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge3JlZjogJ3BpcGUnLCBpZDpuZXdQaXBlSWR9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHBpcGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGUsXHJcbiAgICAgICAgICAgICAgICAgICAgW25ld1BpcGVJZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1hdGlvbnM6IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBbcGlwZUlkXToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBzdGF0ZS5kZWZpbml0aW9uLnBpcGVbcGlwZUlkXS50cmFuc2Zvcm1hdGlvbnMuY29uY2F0KHtyZWY6ICdhZGQnLCBpZDphZGRJZH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9fSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodHJhbnNmb3JtYXRpb24gPT09ICdzdWJ0cmFjdCcpe1xyXG4gICAgICAgICAgICBjb25zdCBuZXdQaXBlSWQgPSB1dWlkKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN1YnRyYWN0SWQgPSB1dWlkKCk7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKHsuLi5zdGF0ZSwgZGVmaW5pdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbixcclxuICAgICAgICAgICAgICAgIHN1YnRyYWN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5zdWJ0cmFjdCxcclxuICAgICAgICAgICAgICAgICAgICBbc3VidHJhY3RJZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtyZWY6ICdwaXBlJywgaWQ6bmV3UGlwZUlkfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwaXBlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIFtuZXdQaXBlSWRdOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtYXRpb25zOiBbXVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgW3BpcGVJZF06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5waXBlW3BpcGVJZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybWF0aW9uczogc3RhdGUuZGVmaW5pdGlvbi5waXBlW3BpcGVJZF0udHJhbnNmb3JtYXRpb25zLmNvbmNhdCh7cmVmOiAnc3VidHJhY3QnLCBpZDpzdWJ0cmFjdElkfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH19KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIFJFU0VUX0FQUF9TVEFURSgpIHtcclxuICAgICAgICBhcHAuc2V0Q3VycmVudFN0YXRlKGFwcC5jcmVhdGVEZWZhdWx0U3RhdGUoKSlcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGV2ZW50U3RhY2s6IFtdfSlcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIFJFU0VUX0FQUF9ERUZJTklUSU9OKCkge1xyXG4gICAgICAgIGlmKHN0YXRlLmRlZmluaXRpb24gIT09IGFwcERlZmluaXRpb24pe1xyXG4gICAgICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246IHsuLi5hcHBEZWZpbml0aW9ufX0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gRlVMTF9TQ1JFRU5fQ0xJQ0tFRCh2YWx1ZSkge1xyXG4gICAgICAgIGlmKHZhbHVlICE9PSBzdGF0ZS5mdWxsU2NyZWVuKXtcclxuICAgICAgICAgICAgc2V0U3RhdGUoey4uLnN0YXRlLCBmdWxsU2NyZWVuOiB2YWx1ZX0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gU0FWRV9ERUZBVUxUKHN0YXRlSWQpIHtcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246e1xyXG4gICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICBzdGF0ZToge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5zdGF0ZSxcclxuICAgICAgICAgICAgICAgIFtzdGF0ZUlkXToge1xyXG4gICAgICAgICAgICAgICAgICAgIC4uLnN0YXRlLmRlZmluaXRpb24uc3RhdGVbc3RhdGVJZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBhcHAuZ2V0Q3VycmVudFN0YXRlKClbc3RhdGVJZF1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH19KVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gREVMRVRFX1NUQVRFKHN0YXRlSWQpIHtcclxuICAgICAgICBjb25zdCB7W3N0YXRlSWRdOiBkZWxldGVkU3RhdGUsIC4uLm5ld1N0YXRlfSA9IHN0YXRlLmRlZmluaXRpb24uc3RhdGVcclxuICAgICAgICBzZXRTdGF0ZSh7Li4uc3RhdGUsIGRlZmluaXRpb246e1xyXG4gICAgICAgICAgICAuLi5zdGF0ZS5kZWZpbml0aW9uLFxyXG4gICAgICAgICAgICBzdGF0ZTogbmV3U3RhdGUsXHJcbiAgICAgICAgICAgIG5hbWVTcGFjZToge1xyXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5uYW1lU3BhY2UsXHJcbiAgICAgICAgICAgICAgICAnX3Jvb3ROYW1lU3BhY2UnOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4uc3RhdGUuZGVmaW5pdGlvbi5uYW1lU3BhY2VbJ19yb290TmFtZVNwYWNlJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlWydfcm9vdE5hbWVTcGFjZSddLmNoaWxkcmVuLmZpbHRlcigocmVmKT0+IHJlZi5pZCAhPT0gc3RhdGVJZClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH19KVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGJveEljb24gPSAoKSA9PiBoKCdpJywge2F0dHJzOiB7Y2xhc3M6ICdtYXRlcmlhbC1pY29ucyd9fSwgJ2xheWVycycpXHJcbiAgICBjb25zdCBpZkljb24gPSAoKSA9PiBoKCdpJywge2F0dHJzOiB7Y2xhc3M6ICdtYXRlcmlhbC1pY29ucyd9LCBzdHlsZToge3RyYW5zZm9ybTogJ3JvdGF0ZSg5MGRlZyknfX0sICdjYWxsX3NwbGl0JylcclxuICAgIGNvbnN0IG51bWJlckljb24gPSAoKSA9PiBoKCdpJywge2F0dHJzOiB7Y2xhc3M6ICdtYXRlcmlhbC1pY29ucyd9fSwgJ2xvb2tzX29uZScpXHJcbiAgICBjb25zdCBsaXN0SWNvbiA9ICgpID0+IGgoJ2knLCB7YXR0cnM6IHtjbGFzczogJ21hdGVyaWFsLWljb25zJ319LCAndmlld19saXN0JylcclxuICAgIGNvbnN0IGlucHV0SWNvbiA9ICgpID0+IGgoJ2knLCB7YXR0cnM6IHtjbGFzczogJ21hdGVyaWFsLWljb25zJ319LCAnaW5wdXQnKVxyXG4gICAgY29uc3QgdGV4dEljb24gPSAoKSA9PiBoKCdpJywge2F0dHJzOiB7Y2xhc3M6ICdtYXRlcmlhbC1pY29ucyd9fSwgJ3RleHRfZmllbGRzJylcclxuICAgIGNvbnN0IGRlbGV0ZUljb24gPSAoKSA9PiBoKCdpJywge2F0dHJzOiB7Y2xhc3M6ICdtYXRlcmlhbC1pY29ucycsICdkYXRhLXRyYXNoY2FuJzogdHJ1ZX19LCAnZGVsZXRlX2ZvcmV2ZXInKVxyXG4gICAgY29uc3QgY2xlYXJJY29uID0gKCkgPT4gaCgnaScsIHthdHRyczoge2NsYXNzOiAnbWF0ZXJpYWwtaWNvbnMnfX0sICdjbGVhcicpXHJcbiAgICBjb25zdCBmb2xkZXJJY29uID0gKCkgPT4gaCgnaScsIHthdHRyczoge2NsYXNzOiAnbWF0ZXJpYWwtaWNvbnMnfX0sICdmb2xkZXInKVxyXG4gICAgY29uc3Qgc2F2ZUljb24gPSAoKSA9PiBoKCdpJywge2F0dHJzOiB7Y2xhc3M6ICdtYXRlcmlhbC1pY29ucyd9fSwgJ2NoZWNrJylcclxuICAgIGNvbnN0IGltYWdlSWNvbiA9ICgpID0+IGgoJ2knLCB7YXR0cnM6IHtjbGFzczogJ21hdGVyaWFsLWljb25zJ319LCAnaW1hZ2UnKVxyXG4gICAgY29uc3QgYXBwSWNvbiA9ICgpID0+IGgoJ2knLCB7YXR0cnM6IHtjbGFzczogJ21hdGVyaWFsLWljb25zJ30sIHN0eWxlOiB7IGZvbnRTaXplOiAnMThweCd9fSwgJ2Rlc2NyaXB0aW9uJylcclxuICAgIGNvbnN0IGFycm93SWNvbiA9IChyb3RhdGUpID0+IGgoJ2knLCB7YXR0cnM6IHtjbGFzczogJ21hdGVyaWFsLWljb25zJywgJ2RhdGEtY2xvc2VhcnJvdyc6IHRydWV9LCBzdHlsZToge3RyYW5zaXRpb246ICdhbGwgMC4ycycsIHRyYW5zZm9ybTogcm90YXRlID8gJ3JvdGF0ZSgtOTBkZWcpJyA6ICdyb3RhdGUoMGRlZyknLCBjdXJzb3I6ICdwb2ludGVyJ319LCAnZXhwYW5kX21vcmUnKVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlbmRlcigpIHtcclxuICAgICAgICBjb25zdCBjdXJyZW50UnVubmluZ1N0YXRlID0gYXBwLmdldEN1cnJlbnRTdGF0ZSgpXHJcbiAgICAgICAgY29uc3QgZHJhZ0NvbXBvbmVudExlZnQgPSBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgIG9uOiB7XHJcbiAgICAgICAgICAgICAgICBtb3VzZWRvd246IFtXSURUSF9EUkFHR0VELCAnZWRpdG9yTGVmdFdpZHRoJ10sXHJcbiAgICAgICAgICAgICAgICB0b3VjaHN0YXJ0OiBbV0lEVEhfRFJBR0dFRCwgJ2VkaXRvckxlZnRXaWR0aCddLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgICAgICAgICByaWdodDogJzAnLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAndHJhbnNsYXRlWCgxMDAlKScsXHJcbiAgICAgICAgICAgICAgICB0b3A6ICcwJyxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAnMTBweCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6ICcxMDAlJyxcclxuICAgICAgICAgICAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogJzFlbScsXHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAnMCcsXHJcbiAgICAgICAgICAgICAgICBjdXJzb3I6ICdjb2wtcmVzaXplJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIGNvbnN0IG9wZW5Db21wb25lbnRMZWZ0ID0gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgbW91c2Vkb3duOiBbT1BFTl9TSURFQkFSLCAnbGVmdCddLFxyXG4gICAgICAgICAgICAgICAgdG91Y2hzdGFydDogW09QRU5fU0lERUJBUiwgJ2xlZnQnXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAgICAgcmlnaHQ6ICctM3B4JyxcclxuICAgICAgICAgICAgICAgIHRvcDogJzUwJScsXHJcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm06ICd0cmFuc2xhdGVaKDApIHRyYW5zbGF0ZVgoMTAwJSkgdHJhbnNsYXRlWSgtNTAlKScsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogJzE1cHgnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAnMTAlJyxcclxuICAgICAgICAgICAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogJzFlbScsXHJcbiAgICAgICAgICAgICAgICBib3JkZXJSYWRpdXM6ICcwIDVweCA1cHggMCcsXHJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAnIzVkNWQ1ZCcsXHJcbiAgICAgICAgICAgICAgICBib3hTaGFkb3c6ICdpbnNldCAwIDAgMnB4IDdweCAjMjIyJyxcclxuICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgY29uc3Qgb3BlbkNvbXBvbmVudFJpZ2h0ID0gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgbW91c2Vkb3duOiBbT1BFTl9TSURFQkFSLCAncmlnaHQnXSxcclxuICAgICAgICAgICAgICAgIHRvdWNoc3RhcnQ6IFtPUEVOX1NJREVCQVIsICdyaWdodCddLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgICAgICAgICBsZWZ0OiAnLTNweCcsXHJcbiAgICAgICAgICAgICAgICB0b3A6ICc1MCUnLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAndHJhbnNsYXRlWigwKSB0cmFuc2xhdGVYKC0xMDAlKSB0cmFuc2xhdGVZKC01MCUpJyxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAnMTVweCcsXHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6ICcxMCUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgIGZvbnRTaXplOiAnMWVtJyxcclxuICAgICAgICAgICAgICAgIGJvcmRlclJhZGl1czogJzVweCAwIDAgNXB4JyxcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNWQ1ZDVkJyxcclxuICAgICAgICAgICAgICAgIGJveFNoYWRvdzogJ2luc2V0IDAgMCAycHggN3B4ICMyMjInLFxyXG4gICAgICAgICAgICAgICAgY3Vyc29yOiAncG9pbnRlcicsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjb25zdCBkcmFnQ29tcG9uZW50UmlnaHQgPSBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgIG9uOiB7XHJcbiAgICAgICAgICAgICAgICBtb3VzZWRvd246IFtXSURUSF9EUkFHR0VELCAnZWRpdG9yUmlnaHRXaWR0aCddLFxyXG4gICAgICAgICAgICAgICAgdG91Y2hzdGFydDogW1dJRFRIX0RSQUdHRUQsICdlZGl0b3JSaWdodFdpZHRoJ10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgICAgIGxlZnQ6ICcwJyxcclxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoLTEwMCUpJyxcclxuICAgICAgICAgICAgICAgIHRvcDogJzAnLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6ICcxMHB4JyxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgIGZvbnRTaXplOiAnMWVtJyxcclxuICAgICAgICAgICAgICAgIG9wYWNpdHk6ICcwJyxcclxuICAgICAgICAgICAgICAgIGN1cnNvcjogJ2NvbC1yZXNpemUnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgY29uc3QgZHJhZ1N1YkNvbXBvbmVudFJpZ2h0ID0gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgbW91c2Vkb3duOiBbV0lEVEhfRFJBR0dFRCwgJ3N1YkVkaXRvcldpZHRoJ10sXHJcbiAgICAgICAgICAgICAgICB0b3VjaHN0YXJ0OiBbV0lEVEhfRFJBR0dFRCwgJ3N1YkVkaXRvcldpZHRoJ10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgICAgIHJpZ2h0OiAnMnB4JyxcclxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoMTAwJSknLFxyXG4gICAgICAgICAgICAgICAgdG9wOiAnMCcsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogJzEwcHgnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAnMTAwJScsXHJcbiAgICAgICAgICAgICAgICB0ZXh0QWxpZ246ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgZm9udFNpemU6ICcxZW0nLFxyXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMCxcclxuICAgICAgICAgICAgICAgIGN1cnNvcjogJ2NvbC1yZXNpemUnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgY29uc3QgZHJhZ1N1YkNvbXBvbmVudExlZnQgPSBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgIG9uOiB7XHJcbiAgICAgICAgICAgICAgICBtb3VzZWRvd246IFtXSURUSF9EUkFHR0VELCAnc3ViRWRpdG9yV2lkdGhMZWZ0J10sXHJcbiAgICAgICAgICAgICAgICB0b3VjaHN0YXJ0OiBbV0lEVEhfRFJBR0dFRCwgJ3N1YkVkaXRvcldpZHRoTGVmdCddLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgICAgICAgICBsZWZ0OiAnMnB4JyxcclxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVgoLTEwMCUpJyxcclxuICAgICAgICAgICAgICAgIHRvcDogJzAnLFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6ICcxMHB4JyxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgIGZvbnRTaXplOiAnMWVtJyxcclxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBjdXJzb3I6ICdjb2wtcmVzaXplJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBlbWJlckVkaXRvcihyZWYsIHR5cGUpe1xyXG4gICAgICAgICAgICBjb25zdCBwaXBlID0gc3RhdGUuZGVmaW5pdGlvbltyZWYucmVmXVtyZWYuaWRdXHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBsaXN0VHJhbnNmb3JtYXRpb25zKHRyYW5zZm9ybWF0aW9ucywgdHJhbnNUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtYXRpb25zLm1hcCgodHJhbnNSZWYsIGluZGV4KT0+e1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gc3RhdGUuZGVmaW5pdGlvblt0cmFuc1JlZi5yZWZdW3RyYW5zUmVmLmlkXVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc1JlZi5yZWYgPT09ICdlcXVhbCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHt9LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7a2V5OiBpbmRleCwgc3R5bGU6IHtjb2xvcjogJyNiZGJkYmQnLCBjdXJzb3I6ICdkZWZhdWx0JywgZGlzcGxheTonZmxleCd9fSwgW2goJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMSd9fSwgdHJhbnNSZWYucmVmKSwgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwJywgY29sb3I6IHRyYW5zZm9ybWF0aW9ucy5sZW5ndGgtMSAhPT0gaW5kZXggPyAnI2JkYmRiZCc6IHRyYW5zVHlwZSA9PT0gdHlwZSA/ICdncmVlbic6ICdyZWQnfX0sICd0cnVlL2ZhbHNlJyldKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdMZWZ0OiAnMTVweCd9fSwgW2VtYmVyRWRpdG9yKHRyYW5zZm9ybWVyLnZhbHVlLCB0eXBlKV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc1JlZi5yZWYgPT09ICdhZGQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge2tleTogaW5kZXgsIHN0eWxlOiB7Y29sb3I6ICcjYmRiZGJkJywgY3Vyc29yOiAnZGVmYXVsdCcsIGRpc3BsYXk6J2ZsZXgnfX0sIFtoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzEnfX0sIHRyYW5zUmVmLnJlZiksIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMCcsIGNvbG9yOiB0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoLTEgIT09IGluZGV4ID8gJyNiZGJkYmQnOiB0cmFuc1R5cGUgPT09IHR5cGUgPyAnZ3JlZW4nOiAncmVkJ319LCAnbnVtYmVyJyldKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdMZWZ0OiAnMTVweCd9fSwgW2VtYmVyRWRpdG9yKHRyYW5zZm9ybWVyLnZhbHVlLCAnbnVtYmVyJyldKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNSZWYucmVmID09PSAnc3VidHJhY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge2tleTogaW5kZXgsIHN0eWxlOiB7Y29sb3I6ICcjYmRiZGJkJywgY3Vyc29yOiAnZGVmYXVsdCcsIGRpc3BsYXk6J2ZsZXgnfX0sIFtoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzEnfX0sIHRyYW5zUmVmLnJlZiksIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMCcsIGNvbG9yOiB0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoLTEgIT09IGluZGV4ID8gJyNiZGJkYmQnOiB0cmFuc1R5cGUgPT09IHR5cGUgPyAnZ3JlZW4nOiAncmVkJ319LCAnbnVtYmVyJyldKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdMZWZ0OiAnMTVweCd9fSwgW2VtYmVyRWRpdG9yKHRyYW5zZm9ybWVyLnZhbHVlLCAnbnVtYmVyJyldKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNSZWYucmVmID09PSAnbXVsdGlwbHknKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge2tleTogaW5kZXgsIHN0eWxlOiB7Y29sb3I6ICcjYmRiZGJkJywgY3Vyc29yOiAnZGVmYXVsdCcsIGRpc3BsYXk6J2ZsZXgnfX0sIFtoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzEnfX0sIHRyYW5zUmVmLnJlZiksIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMCcsIGNvbG9yOiB0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoLTEgIT09IGluZGV4ID8gJyNiZGJkYmQnOiB0cmFuc1R5cGUgPT09IHR5cGUgPyAnZ3JlZW4nOiAncmVkJ319LCAnbnVtYmVyJyldKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdMZWZ0OiAnMTVweCd9fSwgW2VtYmVyRWRpdG9yKHRyYW5zZm9ybWVyLnZhbHVlLCAnbnVtYmVyJyldKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNSZWYucmVmID09PSAnZGl2aWRlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge30sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtrZXk6IGluZGV4LCBzdHlsZToge2NvbG9yOiAnI2JkYmRiZCcsIGN1cnNvcjogJ2RlZmF1bHQnLCBkaXNwbGF5OidmbGV4J319LCBbaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcxJ319LCB0cmFuc1JlZi5yZWYpLCBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzAnLCBjb2xvcjogdHJhbnNmb3JtYXRpb25zLmxlbmd0aC0xICE9PSBpbmRleCA/ICcjYmRiZGJkJzogdHJhbnNUeXBlID09PSB0eXBlID8gJ2dyZWVuJzogJ3JlZCd9fSwgJ251bWJlcicpXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nTGVmdDogJzE1cHgnfX0sIFtlbWJlckVkaXRvcih0cmFuc2Zvcm1lci52YWx1ZSwgJ251bWJlcicpXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyYW5zUmVmLnJlZiA9PT0gJ3JlbWFpbmRlcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHt9LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7a2V5OiBpbmRleCwgc3R5bGU6IHtjb2xvcjogJyNiZGJkYmQnLCBjdXJzb3I6ICdkZWZhdWx0JywgZGlzcGxheTonZmxleCd9fSwgW2goJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMSd9fSwgdHJhbnNSZWYucmVmKSwgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwJywgY29sb3I6IHRyYW5zZm9ybWF0aW9ucy5sZW5ndGgtMSAhPT0gaW5kZXggPyAnI2JkYmRiZCc6IHRyYW5zVHlwZSA9PT0gdHlwZSA/ICdncmVlbic6ICdyZWQnfX0sICdudW1iZXInKV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7cGFkZGluZ0xlZnQ6ICcxNXB4J319LCBbZW1iZXJFZGl0b3IodHJhbnNmb3JtZXIudmFsdWUsICdudW1iZXInKV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmICh0cmFuc1JlZi5yZWYgPT09ICdicmFuY2gnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIGlmKHJlc29sdmUodHJhbnNmb3JtZXIucHJlZGljYXRlKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB2YWx1ZSA9IHRyYW5zZm9ybVZhbHVlKHZhbHVlLCB0cmFuc2Zvcm1lci50aGVuKVxyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgdmFsdWUgPSB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZSwgdHJhbnNmb3JtZXIuZWxzZSlcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNSZWYucmVmID09PSAnam9pbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ3NwYW4nLCB7fSwgW2VtYmVyRWRpdG9yKHRyYW5zZm9ybWVyLnZhbHVlLCB0cmFuc1R5cGUpXSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRyYW5zUmVmLnJlZiA9PT0gJ3RvVXBwZXJDYXNlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge30sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2N1cnNvcjogJ2RlZmF1bHQnLCBkaXNwbGF5OidmbGV4J319LCBbaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcxJywgY29sb3I6ICcjYmRiZGJkJ319LCB0cmFuc1JlZi5yZWYpXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0cmFuc1JlZi5yZWYgPT09ICd0b0xvd2VyQ2FzZScpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHt9LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtjdXJzb3I6ICdkZWZhdWx0JywgZGlzcGxheTonZmxleCd9fSwgW2goJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMScsIGNvbG9yOiAnI2JkYmRiZCd9fSwgdHJhbnNSZWYucmVmKV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodHJhbnNSZWYucmVmID09PSAndG9UZXh0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge30sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2N1cnNvcjogJ2RlZmF1bHQnLCBkaXNwbGF5OidmbGV4J319LCBbaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcxJywgY29sb3I6ICcjYmRiZGJkJ319LCB0cmFuc1JlZi5yZWYpXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZ2VuVHJhbnNmb3JtYXRvcnMoKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZFBpcGUgPSBzdGF0ZS5kZWZpbml0aW9uLnBpcGVbc3RhdGUuc2VsZWN0ZWRQaXBlSWRdXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gW2goJ2RpdicsIHtzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnZml4ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogc3RhdGUuY29tcG9uZW50RWRpdG9yUG9zaXRpb24ueSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogc3RhdGUuY29tcG9uZW50RWRpdG9yUG9zaXRpb24ueCAtIDMwNyArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnNTAlJyxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzMwMHB4JyxcclxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICB9fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2Rpdicse3N0eWxlOiB7Ym9yZGVyOiAnM3B4IHNvbGlkICMyMjInLCBmbGV4OiAnMSAxIDAlJywgYmFja2dyb3VuZDogJyM0ZDRkNGQnLCBtYXJnaW5Cb3R0b206ICcxMHB4J319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiAnZGVmYXVsdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjMjIyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdUb3A6ICcycHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0JvdHRvbTogJzVweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJyM1M0IyRUQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluV2lkdGg6ICcxMDAlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSx9LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzUgNSBhdXRvJywgbWFyZ2luOiAnMCA1cHgnLCBtaW5XaWR0aDogJzAnLCBvdmVyZmxvdzogJ2hpZGRlbicsIHdoaXRlU3BhY2U6ICdub3dyYXAnLCB0ZXh0T3ZlcmZsb3c6ICdlbGxpcHNpcycsIGZvbnRTaXplOiAnMC44ZW0nfX0sICdVZ25pcyBUb29sYm94JyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzAgMCBhdXRvJywgbWFyZ2luTGVmdDogJ2F1dG8nLCBjdXJzb3I6ICdwb2ludGVyJywgbWFyZ2luUmlnaHQ6ICc1cHgnLCBjb2xvcjogJ3doaXRlJywgZGlzcGxheTogJ2lubGluZS1mbGV4J30sIG9uOiB7bW91c2Vkb3duOiBbU0VMRUNUX1BJUEUsICcnXSwgdG91Y2hzdGFydDogW1NFTEVDVF9QSVBFLCAnJ119fSwgW2NsZWFySWNvbigpXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgIF0pXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGlwZS52YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7c3R5bGU6IHtwb3NpdGlvbjogJ3JlbGF0aXZlJ319LCBbaCgnZGl2Jywge3N0eWxlOntkaXNwbGF5OidmbGV4JywgYWxpZ25JdGVtczogJ2Jhc2VsaW5lJ30sIG9uOiB7Y2xpY2s6IFtTRUxFQ1RfUElQRSwgcmVmLmlkXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsIHBvc2l0aW9uOiAncmVsYXRpdmUnLCB0cmFuc2Zvcm06ICd0cmFuc2xhdGVaKDApJ319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtvcGFjaXR5OiAnMCcsIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLCB3aGl0ZVNwYWNlOiAncHJlJywgcGFkZGluZzogJzAgNXB4IDJweCA1cHgnLCBib3JkZXJCb3R0b206ICcycHggc29saWQgd2hpdGUnfX0sIHBpcGUudmFsdWUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdpbnB1dCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3RleHQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRsaW5lOiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm94U2hhZG93OiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnaW5saW5lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJCb3R0b206ICcycHggc29saWQgd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb250OiAnaW5oZXJpdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAnMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogJzAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiAnMTAwJScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxleDogJzAgMCBhdXRvJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0OiBbQ0hBTkdFX1NUQVRJQ19WQUxVRSwgcmVmLCAndmFsdWUnLCAndGV4dCddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdXNlbW92ZTogW1BJUEVfSE9WRVJFRCwgcmVmXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXZlUHJvcHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGlwZS52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLmxpc3RUcmFuc2Zvcm1hdGlvbnMocGlwZS50cmFuc2Zvcm1hdGlvbnMsIHBpcGUudHlwZSksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCBzdGF0ZS5zZWxlY3RlZFBpcGVJZCA9PT0gcmVmLmlkID8gZ2VuVHJhbnNmb3JtYXRvcnMoKTogW10pXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocGlwZS52YWx1ZSA9PT0gdHJ1ZSB8fCBwaXBlLnZhbHVlID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGgoJ3NlbGVjdCcsIHtsaXZlUHJvcHM6IHt2YWx1ZTogIHBpcGUudmFsdWUudG9TdHJpbmcoKX0sIHN0eWxlOiB7fSwgIG9uOiB7aW5wdXQ6ICBbQ0hBTkdFX1NUQVRJQ19WQUxVRSwgcmVmLCAndmFsdWUnLCAnYm9vbGVhbiddfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdvcHRpb24nLCB7YXR0cnM6IHt2YWx1ZTogJ3RydWUnfSwgc3R5bGU6IHtjb2xvcjogJ2JsYWNrJ319LCBbJ3RydWUnXSksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnb3B0aW9uJywge2F0dHJzOiB7dmFsdWU6ICdmYWxzZSd9LCBzdHlsZToge2NvbG9yOiAnYmxhY2snfX0sIFsnZmFsc2UnXSksXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWlzTmFOKHBhcnNlRmxvYXQoTnVtYmVyKHBpcGUudmFsdWUpKSkgJiYgaXNGaW5pdGUoTnVtYmVyKHBpcGUudmFsdWUpKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtzdHlsZToge3Bvc2l0aW9uOiAncmVsYXRpdmUnfX0sIFtoKCdkaXYnLCB7c3R5bGU6e2Rpc3BsYXk6J2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJ30sIG9uOiB7Y2xpY2s6IFtTRUxFQ1RfUElQRSwgcmVmLmlkXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnaW5wdXQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyczoge3R5cGU6J251bWJlcid9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0bGluZTogJ25vbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICcwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW46ICAnMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiAnMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2lubGluZS1ibG9jaycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6ICcxMDAlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0RGVjb3JhdGlvbjogJ3VuZGVybGluZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dDogW0NIQU5HRV9TVEFUSUNfVkFMVUUsIHJlZiwgJ3ZhbHVlJywgJ251bWJlciddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpdmVQcm9wczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBOdW1iZXIocGlwZS52YWx1ZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtmbGV4OiAnMCcsIGN1cnNvcjogJ2RlZmF1bHQnLCBjb2xvcjogcGlwZS50cmFuc2Zvcm1hdGlvbnMubGVuZ3RoID4gMCA/ICcjYmRiZGJkJzogdHlwZSA9PT0gJ251bWJlcicgPyAnZ3JlZW4nOiAncmVkJ319LCAnbnVtYmVyJylcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdMZWZ0OiAnMTVweCd9fSwgbGlzdFRyYW5zZm9ybWF0aW9ucyhwaXBlLnRyYW5zZm9ybWF0aW9ucywgcGlwZS50eXBlKSksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywgc3RhdGUuc2VsZWN0ZWRQaXBlSWQgPT09IHJlZi5pZCA/IGdlblRyYW5zZm9ybWF0b3JzKCk6IFtdKVxyXG4gICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYocGlwZS52YWx1ZS5yZWYgPT09ICdzdGF0ZScpe1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGlzcGxTdGF0ZSA9IHN0YXRlLmRlZmluaXRpb25bcGlwZS52YWx1ZS5yZWZdW3BpcGUudmFsdWUuaWRdXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge3N0eWxlOiB7cG9zaXRpb246ICdyZWxhdGl2ZScsIGN1cnNvcjogJ3BvaW50ZXInfX0sIFtoKCdkaXYnLCB7c3R5bGU6e2Rpc3BsYXk6J2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJ30sIG9uOiB7Y2xpY2s6IFtTRUxFQ1RfUElQRSwgcmVmLmlkXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7ZmxleDogJzEnfX0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMCAwIGF1dG8nLCBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJywgcG9zaXRpb246ICdyZWxhdGl2ZScsIHRyYW5zZm9ybTogJ3RyYW5zbGF0ZVooMCknLCBib3hTaGFkb3c6ICdpbnNldCAwIDAgMCAycHggJyArIChzdGF0ZS5zZWxlY3RlZFN0YXRlTm9kZUlkID09PSBwaXBlLnZhbHVlLmlkPyAnI2VhYjY1Yyc6ICcjODI4MjgyJykgLCBiYWNrZ3JvdW5kOiAnIzQ0NCcsIHBhZGRpbmc6ICc0cHggN3B4Jyx9fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtjb2xvcjogJ3doaXRlJywgZGlzcGxheTogJ2lubGluZS1ibG9jayd9LCBvbjoge2NsaWNrOiBbU1RBVEVfTk9ERV9TRUxFQ1RFRCwgcGlwZS52YWx1ZS5pZF19fSwgZGlzcGxTdGF0ZS50aXRsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nTGVmdDogJzE1cHgnfX0sIGxpc3RUcmFuc2Zvcm1hdGlvbnMocGlwZS50cmFuc2Zvcm1hdGlvbnMsIHBpcGUudHlwZSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHN0YXRlLnNlbGVjdGVkUGlwZUlkID09PSByZWYuaWQgPyBnZW5UcmFuc2Zvcm1hdG9ycygpOiBbXSlcclxuICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYocGlwZS52YWx1ZS5yZWYgPT09ICdsaXN0VmFsdWUnKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCAnVE9ETycpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYocGlwZS52YWx1ZS5yZWYgPT09ICdldmVudERhdGEnKXtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50RGF0YSA9IHN0YXRlLmRlZmluaXRpb25bcGlwZS52YWx1ZS5yZWZdW3BpcGUudmFsdWUuaWRdXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2JywgW2goJ2RpdicsIHtzdHlsZTp7ZGlzcGxheTonZmxleCcsIGFsaWduSXRlbXM6ICdjZW50ZXInfSwgb246IHtjbGljazogW1NFTEVDVF9QSVBFLCByZWYuaWRdfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtmbGV4OiAnMSd9fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW2goJ2Rpdicse1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7IGN1cnNvcjogJ3BvaW50ZXInLCBjb2xvcjogc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCA9PT0gcGlwZS52YWx1ZS5pZCA/ICcjZWFiNjVjJzogJ3doaXRlJywgcGFkZGluZzogJzJweCA1cHgnLCBtYXJnaW46ICczcHggM3B4IDAgMCcsIGJvcmRlcjogJzJweCBzb2xpZCAnICsgKHN0YXRlLnNlbGVjdGVkU3RhdGVOb2RlSWQgPT09IHBpcGUudmFsdWUuaWQgPyAnI2VhYjY1Yyc6ICd3aGl0ZScpLCBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb246IHtjbGljazogW1NUQVRFX05PREVfU0VMRUNURUQsIHBpcGUudmFsdWUuaWRdfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtldmVudERhdGEudGl0bGVdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtmbGV4OiAnMCcsIGN1cnNvcjogJ2RlZmF1bHQnLCBjb2xvcjogcGlwZS50cmFuc2Zvcm1hdGlvbnMubGVuZ3RoID4gMCA/ICcjYmRiZGJkJzogZXZlbnREYXRhLnR5cGUgPT09IHR5cGUgPyAnZ3JlZW4nOiAncmVkJ319LCBldmVudERhdGEudHlwZSlcclxuICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdMZWZ0OiAnMTVweCd9fSwgbGlzdFRyYW5zZm9ybWF0aW9ucyhwaXBlLnRyYW5zZm9ybWF0aW9ucywgcGlwZS50eXBlKSksXHJcbiAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBsaXN0U3RhdGUoc3RhdGVJZCkge1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBzdGF0ZS5kZWZpbml0aW9uLnN0YXRlW3N0YXRlSWRdXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGVkaXRpbmdOb2RlKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2lucHV0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRsaW5lOiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICc0cHggN3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm94U2hhZG93OiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdpbmxpbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJ25vbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb250OiAnaW5oZXJpdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6ICcwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogJzAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmbGV4OiAnMCAwIGF1dG8nLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IFtDSEFOR0VfU1RBVEVfTk9ERV9USVRMRSwgc3RhdGVJZF0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBsaXZlUHJvcHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGN1cnJlbnRTdGF0ZS50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdkYXRhLWlzdGl0bGVlZGl0b3InOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6ICcxNHB4JyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZGlzcGxheTogJ2ZsZXgnLCBmbGV4V3JhcDogJ3dyYXAnLCBtYXJnaW5Ub3A6ICc2cHgnfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsICBwb3NpdGlvbjogJ3JlbGF0aXZlJywgdHJhbnNmb3JtOiAndHJhbnNsYXRlWigwKScsIG1hcmdpbjogJzAgN3B4IDAgMCcsICBib3hTaGFkb3c6ICdpbnNldCAwIDAgMCAycHggJyArIChzdGF0ZS5zZWxlY3RlZFN0YXRlTm9kZUlkID09PSBzdGF0ZUlkID8gJyNlYWI2NWMnOiAnIzgyODI4MicpICwgYmFja2dyb3VuZDogJyM0NDQnLCBwYWRkaW5nOiAnNHB4IDdweCcsfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtvcGFjaXR5OiBzdGF0ZS5lZGl0aW5nVGl0bGVOb2RlSWQgPT09IHN0YXRlSWQgPyAnMCc6ICcxJywgY29sb3I6ICd3aGl0ZScsIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snfSwgb246IHttb3VzZWRvd246IFtTVEFURV9EUkFHR0VELCBzdGF0ZUlkXSwgdG91Y2hzdGFydDogW1NUQVRFX0RSQUdHRUQsIHN0YXRlSWRdLCB0b3VjaG1vdmU6IFtIT1ZFUl9NT0JJTEVdLCBkYmxjbGljazogW0VESVRfVklFV19OT0RFX1RJVExFLCBzdGF0ZUlkXX19LCBjdXJyZW50U3RhdGUudGl0bGUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuZWRpdGluZ1RpdGxlTm9kZUlkID09PSBzdGF0ZUlkID8gZWRpdGluZ05vZGUoKTogaCgnc3BhbicpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKCgpPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9TdHlsZUlucHV0ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBjdXJyZW50UnVubmluZ1N0YXRlW3N0YXRlSWRdICE9PSBzdGF0ZS5kZWZpbml0aW9uLnN0YXRlW3N0YXRlSWRdLmRlZmF1bHRWYWx1ZSA/ICdyZ2IoOTEsIDIwNCwgOTEpJyA6ICd3aGl0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJ25vbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dGxpbmU6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnaW5saW5lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGV4OiAnMScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluV2lkdGg6ICc1MHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3hTaGFkb3c6ICdpbnNldCAwIC0ycHggMCAwICcgKyAoc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCA9PT0gc3RhdGVJZCA/ICcjZWFiNjVjJzogJyM4MjgyODInKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY3VycmVudFN0YXRlLnR5cGUgPT09ICd0ZXh0JykgcmV0dXJuIGgoJ2lucHV0Jywge2F0dHJzOiB7dHlwZTogJ3RleHQnfSwgbGl2ZVByb3BzOiB7dmFsdWU6IGN1cnJlbnRSdW5uaW5nU3RhdGVbc3RhdGVJZF19LCBzdHlsZTogbm9TdHlsZUlucHV0LCBvbjoge2lucHV0OiBbQ0hBTkdFX0NVUlJFTlRfU1RBVEVfVEVYVF9WQUxVRSwgc3RhdGVJZF19fSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGN1cnJlbnRTdGF0ZS50eXBlID09PSAnbnVtYmVyJykgcmV0dXJuIGgoJ2lucHV0Jywge2F0dHJzOiB7dHlwZTogJ251bWJlcid9LCBsaXZlUHJvcHM6IHt2YWx1ZTogY3VycmVudFJ1bm5pbmdTdGF0ZVtzdGF0ZUlkXX0sIHN0eWxlOiBub1N0eWxlSW5wdXQsICBvbjoge2lucHV0OiBbQ0hBTkdFX0NVUlJFTlRfU1RBVEVfTlVNQkVSX1ZBTFVFLCBzdGF0ZUlkXX19KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY3VycmVudFN0YXRlLnR5cGUgPT09ICdib29sZWFuJykgcmV0dXJuIGgoJ3NlbGVjdCcsIHtsaXZlUHJvcHM6IHt2YWx1ZTogY3VycmVudFJ1bm5pbmdTdGF0ZVtzdGF0ZUlkXS50b1N0cmluZygpfSwgc3R5bGU6IG5vU3R5bGVJbnB1dCwgIG9uOiB7aW5wdXQ6IFtDSEFOR0VfQ1VSUkVOVF9TVEFURV9URVhUX1ZBTFVFLCBzdGF0ZUlkXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnb3B0aW9uJywge2F0dHJzOiB7dmFsdWU6ICd0cnVlJ30sIHN0eWxlOiB7Y29sb3I6ICdibGFjayd9fSwgWyd0cnVlJ10pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ29wdGlvbicsIHthdHRyczoge3ZhbHVlOiAnZmFsc2UnfSwgc3R5bGU6IHtjb2xvcjogJ2JsYWNrJ319LCBbJ2ZhbHNlJ10pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGN1cnJlbnRTdGF0ZS50eXBlID09PSAndGFibGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCAhPT0gc3RhdGVJZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7a2V5OiAnaWNvbicsb246IHtjbGljazogW1NUQVRFX05PREVfU0VMRUNURUQsIHN0YXRlSWRdfSwgc3R5bGU6IHtkaXNwbGF5OiAnZmxleCcsIGFsaWduSXRlbXM6ICdjZW50ZXInLCBtYXJnaW5Ub3A6ICc3cHgnfX0sIFtsaXN0SWNvbigpXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFibGUgPSBjdXJyZW50UnVubmluZ1N0YXRlW3N0YXRlSWRdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk6ICd0YWJsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjODI4MTgzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsZXg6ICcwIDAgMTAwJSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtkaXNwbGF5OiAnZmxleCd9fSwgIE9iamVjdC5rZXlzKGN1cnJlbnRTdGF0ZS5kZWZpbml0aW9uKS5tYXAoa2V5ID0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2ZsZXg6ICcxJywgcGFkZGluZzogJzJweCA1cHgnLCBib3JkZXJCb3R0b206ICcycHggc29saWQgd2hpdGUnfX0sIGtleSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uT2JqZWN0LmtleXModGFibGUpLm1hcChpZCA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2Rpc3BsYXk6ICdmbGV4J319LCBPYmplY3Qua2V5cyh0YWJsZVtpZF0pLm1hcChrZXkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7ZmxleDogJzEnLCBwYWRkaW5nOiAnMnB4IDVweCd9fSwgdGFibGVbaWRdW2tleV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFN0YXRlLnR5cGUgIT09ICd0YWJsZScgJiYgY3VycmVudFJ1bm5pbmdTdGF0ZVtzdGF0ZUlkXSAhPT0gc3RhdGUuZGVmaW5pdGlvbi5zdGF0ZVtzdGF0ZUlkXS5kZWZhdWx0VmFsdWUgPyBoKCdkaXYnLCB7c3R5bGU6IHtkaXNwbGF5OiAnaW5saW5lLWZsZXgnLCBhbGlnblNlbGY6ICdjZW50ZXInfSwgb246IHtjbGljazogW1NBVkVfREVGQVVMVCwgc3RhdGVJZF19fSwgW3NhdmVJY29uKCldKTogaCgnc3BhbicpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFN0YXRlTm9kZUlkID09PSBzdGF0ZUlkICYmIGN1cnJlbnRTdGF0ZS50eXBlICE9PSAndGFibGUnID8gaCgnZGl2Jywge3N0eWxlOiB7ZGlzcGxheTogJ2lubGluZS1mbGV4JywgYWxpZ25TZWxmOiAnY2VudGVyJ30sIG9uOiB7Y2xpY2s6IFtERUxFVEVfU1RBVEUsIHN0YXRlSWRdfX0sIFtkZWxldGVJY29uKCldKTogaCgnc3BhbicpXHJcbiAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCA9PT0gc3RhdGVJZCA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFN0YXRlLm11dGF0b3JzLm1hcChtdXRhdG9yUmVmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbXV0YXRvciA9IHN0YXRlLmRlZmluaXRpb25bbXV0YXRvclJlZi5yZWZdW211dGF0b3JSZWYuaWRdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gc3RhdGUuZGVmaW5pdGlvblttdXRhdG9yLmV2ZW50LnJlZl1bbXV0YXRvci5ldmVudC5pZF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZW1pdHRlciA9IHN0YXRlLmRlZmluaXRpb25bZXZlbnQuZW1pdHRlci5yZWZdW2V2ZW50LmVtaXR0ZXIuaWRdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7c3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAnIzQ0NCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nVG9wOiAnM3B4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdCb3R0b206ICczcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IHN0YXRlLnNlbGVjdGVkVmlld05vZGUuaWQgPT09IGV2ZW50LmVtaXR0ZXIuaWQgPyAnIzUzQjJFRCc6ICd3aGl0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiAnMC4ycyBhbGwnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluV2lkdGg6ICcxMDAlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgb246IHtjbGljazogW1ZJRVdfTk9ERV9TRUxFQ1RFRCwgZXZlbnQuZW1pdHRlcl19fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsIG1hcmdpbjogJzAgM3B4IDAgNXB4JywgZGlzcGxheTogJ2lubGluZS1mbGV4J319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZW1pdHRlci5yZWYgPT09ICd2Tm9kZUJveCcgPyBib3hJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5lbWl0dGVyLnJlZiA9PT0gJ3ZOb2RlTGlzdCcgPyBsaXN0SWNvbigpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmVtaXR0ZXIucmVmID09PSAndk5vZGVMaXN0JyA/IGlmSWNvbigpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5lbWl0dGVyLnJlZiA9PT0gJ3ZOb2RlSW5wdXQnID8gaW5wdXRJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0SWNvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzUgNSBhdXRvJywgbWFyZ2luOiAnMCA1cHggMCAwJywgbWluV2lkdGg6ICcwJywgb3ZlcmZsb3c6ICdoaWRkZW4nLCB3aGl0ZVNwYWNlOiAnbm93cmFwJywgdGV4dE92ZXJmbG93OiAnZWxsaXBzaXMnfX0sIGVtaXR0ZXIudGl0bGUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsIG1hcmdpbkxlZnQ6ICdhdXRvJywgbWFyZ2luUmlnaHQ6ICc1cHgnLCBjb2xvcjogJyM1YmNjNWInfX0sIGV2ZW50LnR5cGUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicpLFxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBmYWtlU3RhdGUoc3RhdGVJZCkge1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBzdGF0ZS5kZWZpbml0aW9uLnN0YXRlW3N0YXRlSWRdXHJcbiAgICAgICAgICAgIHJldHVybiBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzAgMCBhdXRvJywgIHBvc2l0aW9uOiAncmVsYXRpdmUnLCB0cmFuc2Zvcm06ICd0cmFuc2xhdGVaKDApJywgbWFyZ2luOiAnN3B4IDdweCAwIDAnLCAgYm94U2hhZG93OiAnaW5zZXQgMCAwIDAgMnB4ICcgKyAoc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCA9PT0gc3RhdGVJZCA/ICcjZWFiNjVjJzogJyM4MjgyODInKSAsIGJhY2tncm91bmQ6ICcjNDQ0JywgcGFkZGluZzogJzRweCA3cHgnLH19LCBbXHJcbiAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7Y29sb3I6ICd3aGl0ZScsIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snfX0sIGN1cnJlbnRTdGF0ZS50aXRsZSksXHJcbiAgICAgICAgICAgIF0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzdGF0ZUNvbXBvbmVudCA9IGgoJ2RpdicsIHsgYXR0cnM6IHtjbGFzczogJ2JldHRlci1zY3JvbGxiYXInfSwgc3R5bGU6IHtvdmVyZmxvdzogJ2F1dG8nLCBmbGV4OiAnMScsIHBhZGRpbmc6ICcwIDEwcHgnfSwgb246IHtjbGljazogW1VOU0VMRUNUX1NUQVRFX05PREVdfX0sIHN0YXRlLmRlZmluaXRpb24ubmFtZVNwYWNlWydfcm9vdE5hbWVTcGFjZSddLmNoaWxkcmVuLm1hcCgocmVmKT0+IGxpc3RTdGF0ZShyZWYuaWQpKSlcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gbGlzdE5vZGUobm9kZVJlZiwgcGFyZW50UmVmLCBkZXB0aCl7XHJcbiAgICAgICAgICAgIGlmKG5vZGVSZWYuaWQgPT09ICdfcm9vdE5vZGUnKSByZXR1cm4gbGlzdFJvb3ROb2RlKG5vZGVSZWYpXHJcbiAgICAgICAgICAgIGlmKG5vZGVSZWYucmVmID09PSAndk5vZGVUZXh0JykgcmV0dXJuIHNpbXBsZU5vZGUobm9kZVJlZiwgcGFyZW50UmVmLCBkZXB0aClcclxuICAgICAgICAgICAgaWYobm9kZVJlZi5yZWYgPT09ICd2Tm9kZUltYWdlJykgcmV0dXJuIHNpbXBsZU5vZGUobm9kZVJlZiwgcGFyZW50UmVmLCBkZXB0aClcclxuICAgICAgICAgICAgaWYobm9kZVJlZi5yZWYgPT09ICd2Tm9kZUJveCcgfHwgbm9kZVJlZi5yZWYgPT09ICd2Tm9kZUxpc3QnIHx8IG5vZGVSZWYucmVmID09PSAndk5vZGVJZicpIHJldHVybiBsaXN0Qm94Tm9kZShub2RlUmVmLCBwYXJlbnRSZWYsIGRlcHRoKVxyXG4gICAgICAgICAgICBpZihub2RlUmVmLnJlZiA9PT0gJ3ZOb2RlSW5wdXQnKSByZXR1cm4gc2ltcGxlTm9kZShub2RlUmVmLCBwYXJlbnRSZWYsIGRlcHRoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcHJldmVudF9idWJibGluZyhlKSB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICB9XHJcbiAgICAgICAgZnVuY3Rpb24gZWRpdGluZ05vZGUobm9kZVJlZikge1xyXG4gICAgICAgICAgICByZXR1cm4gaCgnaW5wdXQnLCB7XHJcbiAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ25vbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogJzI2cHgnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICBjb2xvcjogJyM1M0IyRUQnLFxyXG4gICAgICAgICAgICAgICAgICAgIG91dGxpbmU6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICBmbGV4OiAnMScsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogJzAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJveFNoYWRvdzogJ2luc2V0IDAgLTFweCAwIDAgIzUzQjJFRCcsXHJcbiAgICAgICAgICAgICAgICAgICAgZm9udDogJ2luaGVyaXQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmdMZWZ0OiAnMnB4JyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vdXNlZG93bjogcHJldmVudF9idWJibGluZyxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dDogW0NIQU5HRV9WSUVXX05PREVfVElUTEUsIG5vZGVSZWZdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGxpdmVQcm9wczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzdGF0ZS5kZWZpbml0aW9uW25vZGVSZWYucmVmXVtub2RlUmVmLmlkXS50aXRsZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhdHRyczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9mb2N1czogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAnZGF0YS1pc3RpdGxlZWRpdG9yJzogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gbGlzdFJvb3ROb2RlKG5vZGVSZWYpIHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZUlkID0gbm9kZVJlZi5pZFxyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc3RhdGUuZGVmaW5pdGlvbltub2RlUmVmLnJlZl1bbm9kZUlkXVxyXG4gICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdMZWZ0OiAnOHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1JpZ2h0OiAnOHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyM0NDQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJUb3A6ICcycHggc29saWQgIzRkNGQ0ZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvcmRlckJvdHRvbTogJzJweCBzb2xpZCAjMzMzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnMjZweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlU3BhY2U6ICdub3dyYXAnLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiB7bW91c2Vtb3ZlOiBbVklFV19IT1ZFUkVELCBub2RlUmVmLCB7fSwgMV0sIHRvdWNobW92ZTogW0hPVkVSX01PQklMRV19XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtrZXk6IG5vZGVJZCwgc3R5bGU6IHtjb2xvcjogc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gbm9kZUlkID8gJyM1M0IyRUQnOiAnI2JkYmRiZCcsIGRpc3BsYXk6ICdpbmxpbmUtZmxleCd9LCBvbjoge2NsaWNrOiBbVklFV19OT0RFX1NFTEVDVEVELCBub2RlUmVmXX19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcHBJY29uKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdUaXRsZU5vZGVJZCA9PT0gbm9kZUlkID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRpbmdOb2RlKG5vZGVSZWYpOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHsgc3R5bGU6IHtmbGV4OiAnMScsIGN1cnNvcjogJ3BvaW50ZXInLCBjb2xvcjogc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gbm9kZUlkID8gJyM1M0IyRUQnOiAnd2hpdGUnLCB0cmFuc2l0aW9uOiAnY29sb3IgMC4ycycsIHBhZGRpbmdMZWZ0OiAnMnB4J30sIG9uOiB7Y2xpY2s6IFtWSUVXX05PREVfU0VMRUNURUQsIG5vZGVSZWZdLCBkYmxjbGljazogW0VESVRfVklFV19OT0RFX1RJVExFLCBub2RlSWRdfX0sIG5vZGUudGl0bGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHN0YXRlLmhvdmVyZWRWaWV3Tm9kZSAmJiBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucGFyZW50LmlkID09PSBub2RlSWQgJiYgIShub2RlLmNoaWxkcmVuLmZpbmRJbmRleCgocmVmKT0+IHJlZi5pZCA9PT0gc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcuaWQpID09PSBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucG9zaXRpb24pID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgKCgpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb3B5IHBhc3RlZCBmcm9tIGxpc3RCb3hOb2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRQb3NpdGlvbiA9IG5vZGUuY2hpbGRyZW4uZmluZEluZGV4KChyZWYpPT4gcmVmLmlkID09PSBzdGF0ZS5kcmFnZ2VkQ29tcG9uZW50Vmlldy5pZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Bvc2l0aW9uID0gb2xkUG9zaXRpb24gPT09IC0xIHx8IHN0YXRlLmhvdmVyZWRWaWV3Tm9kZS5wb3NpdGlvbiA8IG9sZFBvc2l0aW9uID8gc3RhdGUuaG92ZXJlZFZpZXdOb2RlLnBvc2l0aW9uIDogc3RhdGUuaG92ZXJlZFZpZXdOb2RlLnBvc2l0aW9uICsgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgocmVmKT0+bGlzdE5vZGUocmVmLCBub2RlUmVmLCAxKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZHJlbi5zbGljZSgwLCBuZXdQb3NpdGlvbikuY29uY2F0KHNwYWNlckNvbXBvbmVudCgpLCBjaGlsZHJlbi5zbGljZShuZXdQb3NpdGlvbikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKCk6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4ubWFwKChyZWYpPT5saXN0Tm9kZShyZWYsIG5vZGVSZWYsIDEpKVxyXG4gICAgICAgICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdMZWZ0OiAnOHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdSaWdodDogJzhweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcxNXB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uOiB7bW91c2Vtb3ZlOiBbVklFV19IT1ZFUkVELCB7aWQ6ICdfbGFzdE5vZGUnfSwge30sIDFdLCB0b3VjaG1vdmU6IFtIT1ZFUl9NT0JJTEVdfX1cclxuICAgICAgICAgICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBsaXN0Qm94Tm9kZShub2RlUmVmLCBwYXJlbnRSZWYsIGRlcHRoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJZCA9IG5vZGVSZWYuaWRcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdW25vZGVJZF1cclxuICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wYWNpdHk6IHN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3ICYmIHN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3LmlkID09PSBub2RlSWQgPyAnMC41JyA6ICcxLjAnLFxyXG4gICAgICAgICAgICAgICAgfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogbm9kZUlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnMjZweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0xlZnQ6IChkZXB0aCAtIChub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgfHwgKHN0YXRlLmhvdmVyZWRWaWV3Tm9kZSAmJiBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucGFyZW50LmlkID09PSBub2RlSWQpID8gMTogMCkpICoyMCArIDgrICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nUmlnaHQ6ICc4cHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyM0NDQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyVG9wOiAnMnB4IHNvbGlkICM0ZDRkNGQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyQm90dG9tOiAnMnB4IHNvbGlkICMzMzMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpdGVTcGFjZTogJ25vd3JhcCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gbm9kZUlkID8gJyM1M0IyRUQnOiAnd2hpdGUnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiB7bW91c2Vkb3duOiBbVklFV19EUkFHR0VELCBub2RlUmVmLCBwYXJlbnRSZWYsIGRlcHRoXSwgdG91Y2hzdGFydDogW1ZJRVdfRFJBR0dFRCwgbm9kZVJlZiwgcGFyZW50UmVmLCBkZXB0aF0sIG1vdXNlbW92ZTogW1ZJRVdfSE9WRVJFRCwgbm9kZVJlZiwgcGFyZW50UmVmLCBkZXB0aF0sIHRvdWNobW92ZTogW0hPVkVSX01PQklMRV19fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDAgfHwgKHN0YXRlLmhvdmVyZWRWaWV3Tm9kZSAmJiBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucGFyZW50LmlkID09PSBub2RlSWQpID8gaCgnc3BhbicsIHtzdHlsZToge2Rpc3BsYXk6ICdpbmxpbmUtZmxleCd9fSwgW2Fycm93SWNvbihzdGF0ZS52aWV3Rm9sZGVyc0Nsb3NlZFtub2RlSWRdIHx8IChzdGF0ZS5kcmFnZ2VkQ29tcG9uZW50VmlldyAmJiBub2RlSWQgPT09IHN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3LmlkKSldKTogaCgnc3BhbicpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge2tleTogbm9kZUlkLCBzdHlsZToge2Rpc3BsYXk6ICdpbmxpbmUtZmxleCcsIGNvbG9yOiBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLmlkID09PSBub2RlSWQgPyAnIzUzQjJFRCc6ICcjYmRiZGJkJywgdHJhbnNpdGlvbjogJ2NvbG9yIDAuMnMnfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVSZWYucmVmID09PSAndk5vZGVCb3gnID8gYm94SWNvbigpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlUmVmLnJlZiA9PT0gJ3ZOb2RlTGlzdCcgPyBsaXN0SWNvbigpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWZJY29uKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdUaXRsZU5vZGVJZCA9PT0gbm9kZUlkID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRpbmdOb2RlKG5vZGVSZWYpOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHsgc3R5bGU6IHtmbGV4OiAnMScsIGN1cnNvcjogJ3BvaW50ZXInLCB0cmFuc2l0aW9uOiAnY29sb3IgMC4ycycsIHBhZGRpbmdMZWZ0OiAnMnB4Jywgb3ZlcmZsb3c6ICdoaWRkZW4nLCB3aGl0ZVNwYWNlOiAnbm93cmFwJywgdGV4dE92ZXJmbG93OiAnZWxsaXBzaXMnfSwgb246IHtkYmxjbGljazogW0VESVRfVklFV19OT0RFX1RJVExFLCBub2RlSWRdfX0sIG5vZGUudGl0bGUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtjb2xvcjogJyM1M0IyRUQnLCBjdXJzb3I6ICdwb2ludGVyJywgZGlzcGxheTogc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gbm9kZUlkID8gJ2lubGluZS1mbGV4JzogJ25vbmUnLCBmbGV4OiAnMCAwIGF1dG8nfX0sIFtkZWxldGVJY29uKCldKSxcclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZTogeyBkaXNwbGF5OiBzdGF0ZS52aWV3Rm9sZGVyc0Nsb3NlZFtub2RlSWRdIHx8IChzdGF0ZS5kcmFnZ2VkQ29tcG9uZW50VmlldyAmJiBub2RlSWQgPT09IHN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3LmlkKSA/ICdub25lJzogJ2Jsb2NrJ30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIHN0YXRlLmhvdmVyZWRWaWV3Tm9kZSAmJiBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucGFyZW50LmlkID09PSBub2RlSWQgJiYgIShub2RlLmNoaWxkcmVuLmZpbmRJbmRleCgocmVmKT0+IHJlZi5pZCA9PT0gc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcuaWQpID09PSBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucG9zaXRpb24pID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICgoKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZHMgYSBmYWtlIGNvbXBvbmVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9sZFBvc2l0aW9uID0gbm9kZS5jaGlsZHJlbi5maW5kSW5kZXgoKHJlZik9PiByZWYuaWQgPT09IHN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3LmlkKSAvLyB0aGlzIGlzIG5lZWRlZCBiZWNhdXNlIHdlIHN0aWxsIHNob3cgdGhlIG9sZCBub2RlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UG9zaXRpb24gPSBvbGRQb3NpdGlvbiA9PT0gLTEgfHwgc3RhdGUuaG92ZXJlZFZpZXdOb2RlLnBvc2l0aW9uIDwgb2xkUG9zaXRpb24gPyBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucG9zaXRpb24gOiBzdGF0ZS5ob3ZlcmVkVmlld05vZGUucG9zaXRpb24gKyAxXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgocmVmKT0+bGlzdE5vZGUocmVmLCBub2RlUmVmLCBkZXB0aCsxKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRyZW4uc2xpY2UoMCwgbmV3UG9zaXRpb24pLmNvbmNhdChzcGFjZXJDb21wb25lbnQoKSwgY2hpbGRyZW4uc2xpY2UobmV3UG9zaXRpb24pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoKTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4ubWFwKChyZWYpPT5saXN0Tm9kZShyZWYsIG5vZGVSZWYsIGRlcHRoKzEpKVxyXG4gICAgICAgICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICB9XHJcbiAgICAgICAgZnVuY3Rpb24gc2ltcGxlTm9kZShub2RlUmVmLCBwYXJlbnRSZWYsIGRlcHRoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJZCA9IG5vZGVSZWYuaWRcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdW25vZGVJZF1cclxuICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICBrZXk6IG5vZGVJZCxcclxuICAgICAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcgJiYgc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcuaWQgPT09IG5vZGVJZCA/ICcwLjUnIDogJzEuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcyNnB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0xlZnQ6IGRlcHRoICoyMCArIDggKydweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmdSaWdodDogJzhweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNDQ0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyVG9wOiAnMnB4IHNvbGlkICM0ZDRkNGQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJCb3R0b206ICcycHggc29saWQgIzMzMycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlU3BhY2U6ICdub3dyYXAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gbm9kZUlkID8gJyM1M0IyRUQnOiAnI2JkYmRiZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbjoge21vdXNlZG93bjogW1ZJRVdfRFJBR0dFRCwgbm9kZVJlZiwgcGFyZW50UmVmLCBkZXB0aF0sIHRvdWNoc3RhcnQ6IFtWSUVXX0RSQUdHRUQsIG5vZGVSZWYsIHBhcmVudFJlZiwgZGVwdGhdLCBkYmxjbGljazogW0VESVRfVklFV19OT0RFX1RJVExFLCBub2RlSWRdLCBtb3VzZW1vdmU6IFtWSUVXX0hPVkVSRUQsIG5vZGVSZWYsIHBhcmVudFJlZiwgZGVwdGhdLCB0b3VjaG1vdmU6IFtIT1ZFUl9NT0JJTEVdfVxyXG4gICAgICAgICAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVSZWYucmVmID09PSAndk5vZGVJbnB1dCcgPyBpbnB1dEljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVSZWYucmVmID09PSAndk5vZGVJbWFnZScgPyBpbWFnZUljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0SWNvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdUaXRsZU5vZGVJZCA9PT0gbm9kZUlkID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWRpdGluZ05vZGUobm9kZVJlZik6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMScsIGNvbG9yOiBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLmlkID09PSBub2RlSWQgPyAnIzUzQjJFRCc6ICd3aGl0ZScsIHRyYW5zaXRpb246ICdjb2xvciAwLjJzJywgcGFkZGluZ0xlZnQ6ICcycHgnLCBvdmVyZmxvdzogJ2hpZGRlbicsIHdoaXRlU3BhY2U6ICdub3dyYXAnLCB0ZXh0T3ZlcmZsb3c6ICdlbGxpcHNpcyd9fSwgbm9kZS50aXRsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7Y29sb3I6ICcjNTNCMkVEJywgY3Vyc29yOiAncG9pbnRlcicsIGRpc3BsYXk6IHN0YXRlLnNlbGVjdGVkVmlld05vZGUuaWQgPT09IG5vZGVJZCA/ICdpbmxpbmUtZmxleCc6ICdub25lJywgZmxleDogJzAgMCBhdXRvJ319LCBbZGVsZXRlSWNvbigpXSksXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHNwYWNlckNvbXBvbmVudCgpe1xyXG4gICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICAgICAga2V5OiAnc3BhY2VyJyxcclxuICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiAncG9pbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnNnB4JyxcclxuICAgICAgICAgICAgICAgICAgICBib3hTaGFkb3c6ICdpbnNldCAwIDAgMXB4IDFweCAjNTNCMkVEJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIGZha2VDb21wb25lbnQobm9kZVJlZiwgZGVwdGgsKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJZCA9IG5vZGVSZWYuaWRcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHN0YXRlLmRlZmluaXRpb25bbm9kZVJlZi5yZWZdW25vZGVJZF1cclxuICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICBrZXk6ICdfZmFrZScrbm9kZUlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiAncGFkZGluZy1sZWZ0IDAuMnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcyNnB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0xlZnQ6IChkZXB0aCAtIChub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCA/IDE6IDApKSAqMjAgKyA4ICsncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nUmlnaHQ6ICc4cHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAncmdiYSg2OCw2OCw2OCwwLjgpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyVG9wOiAnMnB4IHNvbGlkICM0ZDRkNGQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXJCb3R0b206ICcycHggc29saWQgIzMzMycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaXRlU3BhY2U6ICdub3dyYXAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gbm9kZUlkID8gJyM1M0IyRUQnOiAnI2JkYmRiZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICAgICAgICAobm9kZVJlZi5yZWYgPT09ICd2Tm9kZUJveCcgfHwgbm9kZVJlZi5yZWYgPT09ICd2Tm9kZUxpc3QnIHx8IG5vZGVSZWYucmVmID09PSAndk5vZGVJZicpICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCAgPyBhcnJvd0ljb24odHJ1ZSk6IGgoJ3NwYW4nLCB7a2V5OiAnX2Zha2VTcGFuJytub2RlSWR9KSxcclxuICAgICAgICAgICAgICAgICAgICBub2RlUmVmLnJlZiA9PT0gJ3ZOb2RlQm94JyA/IGJveEljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVSZWYucmVmID09PSAndk5vZGVMaXN0JyA/IGxpc3RJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVJlZi5yZWYgPT09ICd2Tm9kZUlmJyA/IGlmSWNvbigpOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVSZWYucmVmID09PSAndk5vZGVJbnB1dCcgPyBpbnB1dEljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVSZWYucmVmID09PSAndk5vZGVJbWFnZScgPyBpbWFnZUljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0SWNvbigpLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMScsIGNvbG9yOiBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLmlkID09PSBub2RlSWQgPyAnIzUzQjJFRCc6ICd3aGl0ZScsIHRyYW5zaXRpb246ICdjb2xvciAwLjJzJywgcGFkZGluZ0xlZnQ6ICcycHgnLCBvdmVyZmxvdzogJ2hpZGRlbicsIHdoaXRlU3BhY2U6ICdub3dyYXAnLCB0ZXh0T3ZlcmZsb3c6ICdlbGxpcHNpcyd9fSwgbm9kZS50aXRsZSksXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGdlbmVyYXRlRWRpdE5vZGVDb21wb25lbnQoKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlcyA9IFsnYmFja2dyb3VuZCcsICdib3JkZXInLCAnb3V0bGluZScsICdjdXJzb3InLCAnY29sb3InLCAnZGlzcGxheScsICd0b3AnLCAnYm90dG9tJywgJ2xlZnQnLCAnZmxleCcsICdqdXN0aWZ5Q29udGVudCcsICdhbGlnbkl0ZW1zJywgJ3dpZHRoJywgJ2hlaWdodCcsICdtYXhXaWR0aCcsICdtYXhIZWlnaHQnLCAnbWluV2lkdGgnLCAnbWluSGVpZ2h0JywgJ3JpZ2h0JywgJ3Bvc2l0aW9uJywgJ292ZXJmbG93JywgJ2ZvbnQnLCAnbWFyZ2luJywgJ3BhZGRpbmcnXVxyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZE5vZGUgPSBzdGF0ZS5kZWZpbml0aW9uW3N0YXRlLnNlbGVjdGVkVmlld05vZGUucmVmXVtzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLmlkXVxyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJvcHNDb21wb25lbnQgPSBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHN0YXRlLnNlbGVjdGVkVmlld1N1Yk1lbnUgPT09ICdwcm9wcycgPyAnIzRkNGQ0ZCc6ICcjM2QzZDNkJyxcclxuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnMTBweCAwJyxcclxuICAgICAgICAgICAgICAgICAgICBmbGV4OiAnMScsXHJcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiAncG9pbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsaWNrOiBbU0VMRUNUX1ZJRVdfU1VCTUVOVSwgJ3Byb3BzJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgJ2RhdGEnKVxyXG4gICAgICAgICAgICBjb25zdCBzdHlsZUNvbXBvbmVudCA9IGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogc3RhdGUuc2VsZWN0ZWRWaWV3U3ViTWVudSA9PT0gJ3N0eWxlJyA/ICcjNGQ0ZDRkJzogJyMzZDNkM2QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICcxMHB4IDAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGZsZXg6ICcxJyxcclxuICAgICAgICAgICAgICAgICAgICBib3JkZXJSaWdodDogJzFweCBzb2xpZCAjMjIyJyxcclxuICAgICAgICAgICAgICAgICAgICBib3JkZXJMZWZ0OiAnMXB4IHNvbGlkICMyMjInLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiAncG9pbnRlcicsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb246IHtcclxuICAgICAgICAgICAgICAgICAgICBjbGljazogW1NFTEVDVF9WSUVXX1NVQk1FTlUsICdzdHlsZSddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sICdzdHlsZScpXHJcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50c0NvbXBvbmVudCA9IGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogc3RhdGUuc2VsZWN0ZWRWaWV3U3ViTWVudSA9PT0gJ2V2ZW50cycgPyAnIzRkNGQ0ZCc6ICcjM2QzZDNkJyxcclxuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnMTBweCAwJyxcclxuICAgICAgICAgICAgICAgICAgICBmbGV4OiAnMScsXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dEFsaWduOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsaWNrOiBbU0VMRUNUX1ZJRVdfU1VCTUVOVSwgJ2V2ZW50cyddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sICdldmVudHMnKVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZ2VucHJvcHNTdWJtZW51Q29tcG9uZW50ID0gKCkgPT4gaCgnZGl2JywgWygoKT0+e1xyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnNlbGVjdGVkVmlld05vZGUucmVmID09PSAndk5vZGVCb3gnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5Ub3A6ICcxMDBweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJyNiZGJkYmQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCAnbm8gZGF0YSByZXF1aXJlZCcpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5yZWYgPT09ICd2Tm9kZVRleHQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtzdHlsZToge292ZXJmbG93OiAnYXV0byd9LCBhdHRyczoge1wiY2xhc3NcIjogJ2JldHRlci1zY3JvbGxiYXInfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyM2NzY3NjcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICc1cHggMTBweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luQm90dG9tOiAnMTBweCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcxJ319LCAndGV4dCB2YWx1ZScpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7ZmxleDogJzAnLCBjdXJzb3I6ICdkZWZhdWx0JywgY29sb3I6ICcjYmRiZGJkJ319LCAndGV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nOiAnNXB4IDEwcHgnfX0sIFtlbWJlckVkaXRvcihzZWxlY3RlZE5vZGUudmFsdWUsICd0ZXh0JyldKVxyXG4gICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5yZWYgPT09ICd2Tm9kZUltYWdlJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7c3R5bGU6IHtvdmVyZmxvdzogJ2F1dG8nfSwgYXR0cnM6IHtcImNsYXNzXCI6ICdiZXR0ZXItc2Nyb2xsYmFyJ319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNjc2NzY3JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnNXB4IDEwcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogJzEwcHgnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMSd9fSwgJ3NvdXJjZSAodXJsKScpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7ZmxleDogJzAnLCBjdXJzb3I6ICdkZWZhdWx0JywgY29sb3I6ICcjYmRiZGJkJ319LCAndGV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nOiAnNXB4IDEwcHgnfX0sIFtlbWJlckVkaXRvcihzZWxlY3RlZE5vZGUuc3JjLCAndGV4dCcpXSlcclxuICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnNlbGVjdGVkVmlld05vZGUucmVmID09PSAndk5vZGVJbnB1dCcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge3N0eWxlOiB7b3ZlcmZsb3c6ICdhdXRvJ30sIGF0dHJzOiB7XCJjbGFzc1wiOiAnYmV0dGVyLXNjcm9sbGJhcid9fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAnIzY3Njc2NycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogJzVweCAxMHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5Cb3R0b206ICcxMHB4J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzEnfX0sICdpbnB1dCB2YWx1ZScpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7ZmxleDogJzAnLCBjdXJzb3I6ICdkZWZhdWx0JywgY29sb3I6ICcjYmRiZGJkJ319LCAndGV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nOiAnNXB4IDEwcHgnfX0sIFtlbWJlckVkaXRvcihzZWxlY3RlZE5vZGUudmFsdWUsICd0ZXh0JyldKVxyXG4gICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5yZWYgPT09ICd2Tm9kZUxpc3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtzdHlsZToge292ZXJmbG93OiAnYXV0byd9LCBhdHRyczoge1wiY2xhc3NcIjogJ2JldHRlci1zY3JvbGxiYXInfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyM2NzY3NjcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICc1cHggMTBweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luQm90dG9tOiAnMTBweCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcxJ319LCAndGFibGUnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2ZsZXg6ICcwJywgY3Vyc29yOiAnZGVmYXVsdCcsIGNvbG9yOiAnI2JkYmRiZCd9fSwgJ3RhYmxlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmc6ICc1cHggMTBweCd9fSwgW2VtYmVyRWRpdG9yKHNlbGVjdGVkTm9kZS52YWx1ZSwgJ3RhYmxlJyldKVxyXG4gICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5yZWYgPT09ICd2Tm9kZUlmJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdkaXYnLCB7c3R5bGU6IHtvdmVyZmxvdzogJ2F1dG8nfSwgYXR0cnM6IHtcImNsYXNzXCI6ICdiZXR0ZXItc2Nyb2xsYmFyJ319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNjc2NzY3JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnNXB4IDEwcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogJzEwcHgnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMSd9fSwgJ3ByZWRpY2F0ZScpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7ZmxleDogJzAnLCBjdXJzb3I6ICdkZWZhdWx0JywgY29sb3I6ICcjYmRiZGJkJ319LCAndHJ1ZS9mYWxzZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nOiAnNXB4IDEwcHgnfX0sIFtlbWJlckVkaXRvcihzZWxlY3RlZE5vZGUudmFsdWUsICdib29sZWFuJyldKVxyXG4gICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKCldKVxyXG4gICAgICAgICAgICBjb25zdCBnZW5zdHlsZVN1Ym1lbnVDb21wb25lbnQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZFN0eWxlID0gc3RhdGUuZGVmaW5pdGlvbi5zdHlsZVtzZWxlY3RlZE5vZGUuc3R5bGUuaWRdXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge2F0dHJzOiB7Y2xhc3M6ICdiZXR0ZXItc2Nyb2xsYmFyJ30sIHN0eWxlOiB7b3ZlcmZsb3c6ICdhdXRvJ319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jyx7IHN0eWxlOiB7cGFkZGluZzogJzEwcHgnLCBmb250RmFtaWx5OiBcIidDb21mb3J0YWEnLCBzYW5zLXNlcmlmXCIsICBjb2xvcjogJyNiZGJkYmQnfX0sICdzdHlsZSBwYW5lbCB3aWxsIGNoYW5nZSBhIGxvdCBpbiAxLjB2LCByaWdodCBub3cgaXRcXCdzIGp1c3QgQ1NTJyksXHJcbiAgICAgICAgICAgICAgICAgICAgLi4uT2JqZWN0LmtleXMoc2VsZWN0ZWRTdHlsZSkubWFwKChrZXkpID0+IGgoJ2RpdicsIHtzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIH19LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNjc2NzY3JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnNXB4IDEwcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogJzEwcHgnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMSd9fSwga2V5KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2ZsZXg6ICcwJywgY3Vyc29yOiAnZGVmYXVsdCcsIGNvbG9yOiAnI2JkYmRiZCd9fSwgJ3RleHQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7cGFkZGluZzogJzVweCAxMHB4J319LCBbZW1iZXJFZGl0b3Ioc2VsZWN0ZWRTdHlsZVtrZXldLCAndGV4dCcpXSksXHJcbiAgICAgICAgICAgICAgICAgICAgXSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZTogeyBwYWRkaW5nOiAnNXB4IDEwcHgnLCBmb250RmFtaWx5OiBcIidDb21mb3J0YWEnLCBzYW5zLXNlcmlmXCIsICBjb2xvcjogJyNiZGJkYmQnfX0sICdhZGQgU3R5bGU6JyksXHJcbiAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7IHBhZGRpbmc6ICc1cHggMCA1cHggMTBweCd9fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChrZXkpID0+ICFPYmplY3Qua2V5cyhzZWxlY3RlZFN0eWxlKS5pbmNsdWRlcyhrZXkpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgoa2V5KSA9PiBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb246IHtjbGljazogW0FERF9ERUZBVUxUX1NUWUxFLCBzZWxlY3RlZE5vZGUuc3R5bGUuaWQsIGtleV19LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICczcHggc29saWQgd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnNXB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luVG9wOiAnNXB4J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sICcrICcgKyBrZXkpKVxyXG4gICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZ2VuZXZlbnRzU3VibWVudUNvbXBvbmVudCA9ICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBhdmFpbGFibGVFdmVudHMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ29uIGNsaWNrJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lOiAnY2xpY2snXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnZG91YmxlIGNsaWNrZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWU6ICdkYmxjbGljaydcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdtb3VzZSBvdmVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lOiAnbW91c2VvdmVyJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ21vdXNlIG91dCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZTogJ21vdXNlb3V0J1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5yZWYgPT09ICd2Tm9kZUlucHV0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZUV2ZW50cyA9IGF2YWlsYWJsZUV2ZW50cy5jb25jYXQoW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ2lucHV0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZTogJ2lucHV0J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ2ZvY3VzJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZTogJ2ZvY3VzJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ2JsdXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lOiAnYmx1cidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBdKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudEV2ZW50cyA9IGF2YWlsYWJsZUV2ZW50cy5maWx0ZXIoKGV2ZW50KSA9PiBzZWxlY3RlZE5vZGVbZXZlbnQucHJvcGVydHlOYW1lXSlcclxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50c0xlZnQgPSBhdmFpbGFibGVFdmVudHMuZmlsdGVyKChldmVudCkgPT4gIXNlbGVjdGVkTm9kZVtldmVudC5wcm9wZXJ0eU5hbWVdKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtzdHlsZToge3BhZGRpbmdUb3A6ICcyMHB4J319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLihjdXJyZW50RXZlbnRzLmxlbmd0aCA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50RXZlbnRzLm1hcCgoZXZlbnREZXNjKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzdGF0ZS5kZWZpbml0aW9uW3NlbGVjdGVkTm9kZVtldmVudERlc2MucHJvcGVydHlOYW1lXS5yZWZdW3NlbGVjdGVkTm9kZVtldmVudERlc2MucHJvcGVydHlOYW1lXS5pZF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2JywgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtiYWNrZ3JvdW5kOiAnIzY3Njc2NycsIHBhZGRpbmc6ICc1cHggMTBweCd9fSwgZXZlbnQudHlwZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7c3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiAnY29sb3IgMC4ycycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6ICcxNHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnNXB4IDEwcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGV2ZW50Lm11dGF0b3JzLm1hcChtdXRhdG9yUmVmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtdXRhdG9yID0gc3RhdGUuZGVmaW5pdGlvblttdXRhdG9yUmVmLnJlZl1bbXV0YXRvclJlZi5pZF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZURlZiA9IHN0YXRlLmRlZmluaXRpb25bbXV0YXRvci5zdGF0ZS5yZWZdW211dGF0b3Iuc3RhdGUuaWRdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtzdHlsZToge21hcmdpblRvcDogJzEwcHgnfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLCBwb3NpdGlvbjogJ3JlbGF0aXZlJywgdHJhbnNmb3JtOiAndHJhbnNsYXRlWigwKScsIGJveFNoYWRvdzogJ2luc2V0IDAgMCAwIDJweCAnICsgKHN0YXRlLnNlbGVjdGVkU3RhdGVOb2RlSWQgPT09IG11dGF0b3Iuc3RhdGUuaWQgPyAnI2VhYjY1Yyc6ICcjODI4MjgyJykgLCBiYWNrZ3JvdW5kOiAnIzQ0NCcsIHBhZGRpbmc6ICc0cHggN3B4Jyx9fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2NvbG9yOiAnd2hpdGUnLCBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30sIG9uOiB7Y2xpY2s6IFtTVEFURV9OT0RFX1NFTEVDVEVELCBtdXRhdG9yLnN0YXRlLmlkXX19LCBzdGF0ZURlZi50aXRsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbWJlckVkaXRvcihtdXRhdG9yLm11dGF0aW9uLCBzdGF0ZURlZi50eXBlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFtdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7IHBhZGRpbmc6ICc1cHggMTBweCcsIGZvbnRGYW1pbHk6IFwiJ0NvbWZvcnRhYScsIHNhbnMtc2VyaWZcIiwgIGNvbG9yOiAnI2JkYmRiZCd9fSwgJ2FkZCBFdmVudDonKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2JywgIHtzdHlsZTogeyBwYWRkaW5nOiAnNXB4IDAgNXB4IDEwcHgnfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmV2ZW50c0xlZnQubWFwKChldmVudCkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICczcHggc29saWQgIzViY2M1YicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICc1cHgnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAnMTBweCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgb246IHtjbGljazogW0FERF9FVkVOVCwgZXZlbnQucHJvcGVydHlOYW1lLCBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlXX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAnKyAnICsgZXZlbnQuZGVzY3JpcHRpb24pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSksXHJcbiAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmdWxsVk5vZGUgPSBbJ3ZOb2RlQm94Jywndk5vZGVUZXh0JywgJ3ZOb2RlSW1hZ2UnLCAndk5vZGVJbnB1dCddLmluY2x1ZGVzKHN0YXRlLnNlbGVjdGVkVmlld05vZGUucmVmKVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdmaXhlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgZm9udDogXCIzMDAgMS4yZW0gJ09wZW4gU2FucydcIixcclxuICAgICAgICAgICAgICAgICAgICBsaW5lSGVpZ2h0OiAnMS4yZW0nLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHN0YXRlLmNvbXBvbmVudEVkaXRvclBvc2l0aW9uLnggKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogc3RhdGUuY29tcG9uZW50RWRpdG9yUG9zaXRpb24ueSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiAnNTAlJyxcclxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgekluZGV4OiAnMzAwMCcsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIFtcclxuICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2ZsZXg6ICcxJywgZGlzcGxheTogJ2ZsZXgnLCBtYXJnaW5Cb3R0b206ICcxMHB4JywgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsIGJhY2tncm91bmQ6ICcjNGQ0ZDRkJywgd2lkdGg6IHN0YXRlLnN1YkVkaXRvcldpZHRoICsgJ3B4JywgYm9yZGVyOiAnM3B4IHNvbGlkICMyMjInfX0sW1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdkZWZhdWx0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyMyMjInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1RvcDogJzJweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWRkaW5nQm90dG9tOiAnNXB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnIzUzQjJFRCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5XaWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbW91c2Vkb3duOiBbQ09NUE9ORU5UX1ZJRVdfRFJBR0dFRF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3VjaHN0YXJ0OiBbQ09NUE9ORU5UX1ZJRVdfRFJBR0dFRF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sfSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZToge2ZsZXg6ICcwIDAgYXV0bycsIG1hcmdpbjogJzAgMnB4IDAgNXB4JywgZGlzcGxheTogJ2lubGluZS1mbGV4J319LCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZS5pZCA9PT0gJ19yb290Tm9kZScgPyBhcHBJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZiA9PT0gJ3ZOb2RlQm94JyA/IGJveEljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZiA9PT0gJ3ZOb2RlTGlzdCcgPyBsaXN0SWNvbigpIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZiA9PT0gJ3ZOb2RlTGlzdCcgPyBpZkljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLnNlbGVjdGVkVmlld05vZGUucmVmID09PSAndk5vZGVJbnB1dCcgPyBpbnB1dEljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZiA9PT0gJ3ZOb2RlSW1hZ2UnID8gaW1hZ2VJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRJY29uKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnNSA1IGF1dG8nLCBtYXJnaW46ICcwIDVweCAwIDAnLCBtaW5XaWR0aDogJzAnLCBvdmVyZmxvdzogJ2hpZGRlbicsIHdoaXRlU3BhY2U6ICdub3dyYXAnLCB0ZXh0T3ZlcmZsb3c6ICdlbGxpcHNpcycsIGZvbnRTaXplOiAnMC44ZW0nfX0sIHNlbGVjdGVkTm9kZS50aXRsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzAgMCBhdXRvJywgbWFyZ2luTGVmdDogJ2F1dG8nLCBjdXJzb3I6ICdwb2ludGVyJywgbWFyZ2luUmlnaHQ6ICc1cHgnLCBjb2xvcjogJ3doaXRlJywgZGlzcGxheTogJ2lubGluZS1mbGV4J30sIG9uOiB7bW91c2Vkb3duOiBbVU5TRUxFQ1RfVklFV19OT0RFLCBmYWxzZSwgdHJ1ZV0sIHRvdWNoc3RhcnQ6IFtVTlNFTEVDVF9WSUVXX05PREUsIGZhbHNlLCB0cnVlXX19LCBbY2xlYXJJY29uKCldKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICBmdWxsVk5vZGUgPyBoKCdkaXYnLCB7c3R5bGU6IHsgZGlzcGxheTogJ2ZsZXgnLCBmbGV4OiAnMCAwIGF1dG8nLCBmb250RmFtaWx5OiBcIidDb21mb3J0YWEnLCBzYW5zLXNlcmlmXCJ9fSwgW3Byb3BzQ29tcG9uZW50LCBzdHlsZUNvbXBvbmVudCwgZXZlbnRzQ29tcG9uZW50XSkgOiBoKCdzcGFuJyksXHJcbiAgICAgICAgICAgICAgICAgICAgZHJhZ1N1YkNvbXBvbmVudFJpZ2h0LFxyXG4gICAgICAgICAgICAgICAgICAgIGRyYWdTdWJDb21wb25lbnRMZWZ0LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnNlbGVjdGVkVmlld1N1Yk1lbnUgPT09ICdwcm9wcycgfHwgIWZ1bGxWTm9kZSA/IGdlbnByb3BzU3VibWVudUNvbXBvbmVudCgpOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdTdWJNZW51ID09PSAnc3R5bGUnID8gZ2Vuc3R5bGVTdWJtZW51Q29tcG9uZW50KCk6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdTdWJNZW51ID09PSAnZXZlbnRzJyA/IGdlbmV2ZW50c1N1Ym1lbnVDb21wb25lbnQoKTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywgJ0Vycm9yLCBubyBzdWNoIG1lbnUnKVxyXG4gICAgICAgICAgICAgICAgXSlcclxuICAgICAgICAgICAgXSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFkZFN0YXRlQ29tcG9uZW50ID0gaCgnZGl2Jywge3N0eWxlOiB7IGZsZXg6ICcwIGF1dG8nLCBtYXJnaW5MZWZ0OiBzdGF0ZS5yaWdodE9wZW4gPyAnLTEwcHgnOiAnMCcsIGJvcmRlcjogJzNweCBzb2xpZCAjMjIyJywgYm9yZGVyUmlnaHQ6ICdub25lJywgYmFja2dyb3VuZDogJyMzMzMnLCBoZWlnaHQ6ICc0MHB4JywgZGlzcGxheTogJ2ZsZXgnLCBhbGlnbkl0ZW1zOiAnY2VudGVyJ319LCBbXHJcbiAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHsgZm9udEZhbWlseTogXCInQ29tZm9ydGFhJywgc2Fucy1zZXJpZlwiLCBmb250U2l6ZTogJzAuOWVtJywgY3Vyc29yOiAncG9pbnRlcicsIHBhZGRpbmc6ICcwIDVweCd9fSwgJ2FkZCBzdGF0ZTogJyksXHJcbiAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30sIG9uOiB7Y2xpY2s6IFtBRERfU1RBVEUsICdfcm9vdE5hbWVTcGFjZScsICd0ZXh0J119fSwgW3RleHRJY29uKCldKSxcclxuICAgICAgICAgICAgaCgnc3BhbicsIHtvbjoge2NsaWNrOiBbQUREX1NUQVRFLCAnX3Jvb3ROYW1lU3BhY2UnLCAnbnVtYmVyJ119fSwgW251bWJlckljb24oKV0pLFxyXG4gICAgICAgICAgICBoKCdzcGFuJywge29uOiB7Y2xpY2s6IFtBRERfU1RBVEUsICdfcm9vdE5hbWVTcGFjZScsICdib29sZWFuJ119fSwgW2lmSWNvbigpXSksXHJcbiAgICAgICAgICAgIC8vaCgnc3BhbicsIHtvbjoge2NsaWNrOiBbQUREX1NUQVRFLCAnX3Jvb3ROYW1lU3BhY2UnLCAndGFibGUnXX19LCBbbGlzdEljb24oKV0pLFxyXG4gICAgICAgIF0pXHJcblxyXG5cclxuICAgICAgICBjb25zdCBhZGRWaWV3Tm9kZUNvbXBvbmVudCA9IGgoJ2RpdicsIHtzdHlsZTogeyBmbGV4OiAnMCBhdXRvJywgbWFyZ2luTGVmdDogc3RhdGUucmlnaHRPcGVuID8gJy0xMHB4JzogJzAnLCBib3JkZXI6ICczcHggc29saWQgIzIyMicsIGJvcmRlclJpZ2h0OiAnbm9uZScsIGJhY2tncm91bmQ6ICcjMzMzJywgaGVpZ2h0OiAnNDBweCcsIGRpc3BsYXk6ICdmbGV4JywgYWxpZ25JdGVtczogJ2NlbnRlcid9fSwgW1xyXG4gICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7IGZvbnRGYW1pbHk6IFwiJ0NvbWZvcnRhYScsIHNhbnMtc2VyaWZcIiwgZm9udFNpemU6ICcwLjllbScsIHBhZGRpbmc6ICcwIDEwcHgnfX0sICdhZGQgY29tcG9uZW50OiAnKSxcclxuICAgICAgICAgICAgaCgnc3BhbicsIHtvbjoge2NsaWNrOiBbQUREX05PREUsIHN0YXRlLnNlbGVjdGVkVmlld05vZGUsICdib3gnXX19LCBbYm94SWNvbigpXSksXHJcbiAgICAgICAgICAgIGgoJ3NwYW4nLCB7b246IHtjbGljazogW0FERF9OT0RFLCBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLCAnaW5wdXQnXX19LCBbaW5wdXRJY29uKCldKSxcclxuICAgICAgICAgICAgaCgnc3BhbicsIHtvbjoge2NsaWNrOiBbQUREX05PREUsIHN0YXRlLnNlbGVjdGVkVmlld05vZGUsICd0ZXh0J119fSwgW3RleHRJY29uKCldKSxcclxuICAgICAgICAgICAgaCgnc3BhbicsIHtvbjoge2NsaWNrOiBbQUREX05PREUsIHN0YXRlLnNlbGVjdGVkVmlld05vZGUsICdpbWFnZSddfX0sIFtpbWFnZUljb24oKV0pLFxyXG4gICAgICAgICAgICBoKCdzcGFuJywge29uOiB7Y2xpY2s6IFtBRERfTk9ERSwgc3RhdGUuc2VsZWN0ZWRWaWV3Tm9kZSwgJ2lmJ119fSwgW2lmSWNvbigpXSksXHJcbiAgICAgICAgXSlcclxuXHJcbiAgICAgICAgY29uc3Qgdmlld0NvbXBvbmVudCA9IGgoJ2RpdicsIHthdHRyczoge2NsYXNzOiAnYmV0dGVyLXNjcm9sbGJhcid9LCBzdHlsZToge292ZXJmbG93OiAnYXV0bycsIHBvc2l0aW9uOiAncmVsYXRpdmUnLCBmbGV4OiAnMScsIGZvbnRTaXplOiAnMC44ZW0nfSwgb246IHtjbGljazogW1VOU0VMRUNUX1ZJRVdfTk9ERSwgdHJ1ZSwgZmFsc2VdfX0sIFtcclxuICAgICAgICAgICAgbGlzdE5vZGUoe3JlZjogJ3ZOb2RlQm94JywgaWQ6J19yb290Tm9kZSd9LCB7fSwgMCksXHJcbiAgICAgICAgXSlcclxuXHJcbiAgICAgICAgY29uc3QgcmlnaHRDb21wb25lbnQgPVxyXG4gICAgICAgICAgICBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcclxuICAgICAgICAgICAgICAgICAgICBmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgICAgICAgICB0b3A6ICcwJyxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDogJzAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvbnQ6IFwiMzAwIDEuMmVtICdPcGVuIFNhbnMnXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbGluZUhlaWdodDogJzEuMmVtJyxcclxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogc3RhdGUuZWRpdG9yUmlnaHRXaWR0aCArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyM0ZDRkNGQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJveFNpemluZzogXCJib3JkZXItYm94XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyTGVmdDogJzNweCBzb2xpZCAjMjIyJyxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiAnMC41cyB0cmFuc2Zvcm0nLFxyXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogc3RhdGUucmlnaHRPcGVuID8gJ3RyYW5zbGF0ZVooMCkgdHJhbnNsYXRlWCgwJSknOiAndHJhbnNsYXRlWigwKSB0cmFuc2xhdGVYKDEwMCUpJyxcclxuICAgICAgICAgICAgICAgICAgICB1c2VyU2VsZWN0OiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgICAgICBkcmFnQ29tcG9uZW50UmlnaHQsXHJcbiAgICAgICAgICAgICAgICBvcGVuQ29tcG9uZW50UmlnaHQsXHJcbiAgICAgICAgICAgICAgICBhZGRTdGF0ZUNvbXBvbmVudCxcclxuICAgICAgICAgICAgICAgIHN0YXRlQ29tcG9uZW50LFxyXG4gICAgICAgICAgICAgICAgYWRkVmlld05vZGVDb21wb25lbnQsXHJcbiAgICAgICAgICAgICAgICB2aWV3Q29tcG9uZW50LFxyXG4gICAgICAgICAgICBdKVxyXG5cclxuICAgICAgICBjb25zdCB0b3BDb21wb25lbnQgPSBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICBmbGV4OiAnMSBhdXRvJyxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogJzc1cHgnLFxyXG4gICAgICAgICAgICAgICAgbWF4SGVpZ2h0OiAnNzVweCcsXHJcbiAgICAgICAgICAgICAgICBtaW5IZWlnaHQ6ICc3NXB4JyxcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjMjIyJyxcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6J2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxyXG4gICAgICAgICAgICAgICAgZm9udEZhbWlseTogXCInQ29tZm9ydGFhJywgc2Fucy1zZXJpZlwiLFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICBoKCdhJywge3N0eWxlOiB7ZmxleDogJzAgYXV0bycsIHdpZHRoOiAnMTkwcHgnLCB0ZXh0RGVjb3JhdGlvbjogJ2luaGVyaXQnLCB1c2VyU2VsZWN0OiAnbm9uZSd9LCBhdHRyczoge2hyZWY6Jy9fZGV2J319LCBbXHJcbiAgICAgICAgICAgICAgICBoKCdpbWcnLHtzdHlsZTogeyBtYXJnaW46ICc3cHggLTJweCAtM3B4IDVweCcsIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snfSwgYXR0cnM6IHtzcmM6ICcvaW1hZ2VzL2xvZ28yNTZ4MjU2LnBuZycsIGhlaWdodDogJzU3J319KSxcclxuICAgICAgICAgICAgICAgIGgoJ3NwYW4nLHtzdHlsZTogeyBmb250U2l6ZTonNDRweCcsICB2ZXJ0aWNhbEFsaWduOiAnYm90dG9tJywgY29sb3I6ICcjZmZmJ319LCAndWduaXMnKVxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgICAgIHRvcDogJzAnLFxyXG4gICAgICAgICAgICAgICAgcmlnaHQ6ICcwJyxcclxuICAgICAgICAgICAgICAgIGJvcmRlcjogJ25vbmUnLFxyXG4gICAgICAgICAgICAgICAgY29sb3I6ICd3aGl0ZScsXHJcbiAgICAgICAgICAgICAgICBmb250RmFtaWx5OiBcIidDb21mb3J0YWEnLCBzYW5zLXNlcmlmXCIsXHJcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogJzE2cHgnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAnIzQ0NDQ0NCcsXHJcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiAnbm9uZScsXHJcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6ICd3aGl0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogJ2lubGluZS1ibG9jaycsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogJzE1cHggMjBweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiAnMTNweCAxM3B4IDAgMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiAncG9pbnRlcicsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaWNrOiBbRlVMTF9TQ1JFRU5fQ0xJQ0tFRCwgdHJ1ZV1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCAnZnVsbCBzY3JlZW4nKSxcclxuICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNDQ0NDQ0JyxcclxuICAgICAgICAgICAgICAgICAgICBib3JkZXI6ICdub25lJyxcclxuICAgICAgICAgICAgICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcclxuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiAnMTVweCAyMHB4JyxcclxuICAgICAgICAgICAgICAgICAgICBtYXJnaW46ICcxM3B4IDEzcHggMCAwJyxcclxuICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xpY2s6IFJFU0VUX0FQUF9TVEFURVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sICdyZXNldCBzdGF0ZScpLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyM0NDQ0NDQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogJ25vbmUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiAnd2hpdGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6ICcxNXB4IDIwcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgIG1hcmdpbjogJzEzcHggMTNweCAwIDAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGljazogUkVTRVRfQVBQX0RFRklOSVRJT05cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCAncmVzZXQgZGVtbycpXHJcbiAgICAgICAgICAgIF0pXHJcbiAgICAgICAgXSlcclxuICAgICAgICBjb25zdCBsZWZ0Q29tcG9uZW50ID0gaCgnZGl2Jywge1xyXG4gICAgICAgICAgICBzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgZGlzcGxheTogJ2ZsZXgnLFxyXG4gICAgICAgICAgICAgICAgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcclxuICAgICAgICAgICAgICAgIHRvcDogJzAnLFxyXG4gICAgICAgICAgICAgICAgbGVmdDogJzAnLFxyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAnMTAwJScsXHJcbiAgICAgICAgICAgICAgICBjb2xvcjogJ3doaXRlJyxcclxuICAgICAgICAgICAgICAgIGZvbnQ6IFwiMzAwIDEuMmVtICdPcGVuIFNhbnMnXCIsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogc3RhdGUuZWRpdG9yTGVmdFdpZHRoICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjNGQ0ZDRkJyxcclxuICAgICAgICAgICAgICAgIGJveFNpemluZzogXCJib3JkZXItYm94XCIsXHJcbiAgICAgICAgICAgICAgICBib3JkZXJSaWdodDogJzNweCBzb2xpZCAjMjIyJyxcclxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb246ICcwLjVzIHRyYW5zZm9ybScsXHJcbiAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IHN0YXRlLmxlZnRPcGVuID8gJ3RyYW5zbGF0ZVooMCkgdHJhbnNsYXRlWCgwJSknOiAndHJhbnNsYXRlWigwKSB0cmFuc2xhdGVYKC0xMDAlKScsXHJcbiAgICAgICAgICAgICAgICB1c2VyU2VsZWN0OiAnbm9uZScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICBkcmFnQ29tcG9uZW50TGVmdCxcclxuICAgICAgICAgICAgb3BlbkNvbXBvbmVudExlZnQsXHJcbiAgICAgICAgICAgIGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgICAgIG9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xpY2s6IEZSRUVaRVJfQ0xJQ0tFRFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmxleDogJzAgYXV0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFkZGluZzogJzEwcHgnLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRBbGlnbjogJ2NlbnRlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyMzMzMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcjogJ3BvaW50ZXInLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICAgICAgaCgnc3BhbicsIHtzdHlsZTogeyBwYWRkaW5nOiAnMTVweCAxNXB4IDEwcHggMTVweCcsIGNvbG9yOiBzdGF0ZS5hcHBJc0Zyb3plbiA/ICdyZ2IoOTEsIDIwNCwgOTEpJyA6ICdyZ2IoMjA0LCA5MSwgOTEpJ319LCBzdGF0ZS5hcHBJc0Zyb3plbiA/ICfilronIDogJ+KdmuKdmicpLFxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgaCgnZGl2Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJzOiB7Y2xhc3M6ICdiZXR0ZXItc2Nyb2xsYmFyJ30sXHJcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmxleDogJzEgYXV0bycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJmbG93OiAnYXV0bydcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc3RhdGUuZXZlbnRTdGFja1xyXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKGV2ZW50RGF0YSk9PnN0YXRlLmRlZmluaXRpb24uZXZlbnRbZXZlbnREYXRhLmV2ZW50SWRdICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgLnJldmVyc2UoKSAvLyBtdXRhdGVzIHRoZSBhcnJheSwgYnV0IGl0IHdhcyBhbHJlYWR5IGNvcGllZCB3aXRoIGZpbHRlclxyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKGV2ZW50RGF0YSwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBzdGF0ZS5kZWZpbml0aW9uLmV2ZW50W2V2ZW50RGF0YS5ldmVudElkXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbWl0dGVyID0gc3RhdGUuZGVmaW5pdGlvbltldmVudC5lbWl0dGVyLnJlZl1bZXZlbnQuZW1pdHRlci5pZF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm8gaWRlYSB3aHkgdGhpcyBrZXkgd29ya3MsIGRvbid0IHRvdWNoIGl0LCBwcm9iYWJseSByZXJlbmRlcnMgbW9yZSB0aGFuIG5lZWRlZCwgYnV0IHdobyBjYXJlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCgnZGl2Jywge2tleTogZXZlbnQuZW1pdHRlci5pZCArIGluZGV4LCBzdHlsZToge21hcmdpbkJvdHRvbTogJzEwcHgnfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2RpdicsIHtzdHlsZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5Cb3R0b206ICcxMHB4JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6ICdwb2ludGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAnIzQ0NCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ1RvcDogJzNweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFkZGluZ0JvdHRvbTogJzNweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3I6IHN0YXRlLnNlbGVjdGVkVmlld05vZGUuaWQgPT09IGV2ZW50LmVtaXR0ZXIuaWQgPyAnIzUzQjJFRCc6ICd3aGl0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNpdGlvbjogJzAuMnMgYWxsJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5XaWR0aDogJzEwMCUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgb246IHtjbGljazogW1ZJRVdfTk9ERV9TRUxFQ1RFRCwgZXZlbnQuZW1pdHRlcl19fSwgW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtmbGV4OiAnMCAwIGF1dG8nLCBtYXJnaW46ICcwIDAgMCA1cHgnLCBkaXNwbGF5OiAnaW5saW5lLWZsZXgnfX0sIFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZW1pdHRlci5yZWYgPT09ICd2Tm9kZUJveCcgPyBib3hJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZW1pdHRlci5yZWYgPT09ICd2Tm9kZUxpc3QnID8gbGlzdEljb24oKSA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZW1pdHRlci5yZWYgPT09ICd2Tm9kZUxpc3QnID8gaWZJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5lbWl0dGVyLnJlZiA9PT0gJ3ZOb2RlSW5wdXQnID8gaW5wdXRJY29uKCkgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dEljb24oKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzUgNSBhdXRvJywgbWFyZ2luOiAnMCA1cHggMCAwJywgbWluV2lkdGg6ICcwJywgb3ZlcmZsb3c6ICdoaWRkZW4nLCB3aGl0ZVNwYWNlOiAnbm93cmFwJywgIHRleHRPdmVyZmxvdzogJ2VsbGlwc2lzJ319LCBlbWl0dGVyLnRpdGxlKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywge3N0eWxlOiB7ZmxleDogJzAgMCBhdXRvJywgZm9udEZhbWlseTogXCInQ29tZm9ydGFhJywgc2Fucy1zZXJpZlwiLCBmb250U2l6ZTogJzAuOWVtJywgbWFyZ2luTGVmdDogJ2F1dG8nLCBtYXJnaW5SaWdodDogJzVweCcsIGNvbG9yOiAnIzViY2M1Yid9fSwgZXZlbnQudHlwZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGV2ZW50RGF0YS5tdXRhdGlvbnMpLmxlbmd0aCA9PT0gMCA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7IHBhZGRpbmc6ICc1cHggMTBweCcsIGZvbnRGYW1pbHk6IFwiJ0NvbWZvcnRhYScsIHNhbnMtc2VyaWZcIiwgIGNvbG9yOiAnI2JkYmRiZCd9fSwgJ25vdGhpbmcgaGFzIGNoYW5nZWQnKTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6IHtwYWRkaW5nTGVmdDogJzEwcHgnLCB3aGl0ZVNwYWNlOiAnbm93cmFwJ319LCBPYmplY3Qua2V5cyhldmVudERhdGEubXV0YXRpb25zKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHN0YXRlSWQgPT4gc3RhdGUuZGVmaW5pdGlvbi5zdGF0ZVtzdGF0ZUlkXSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHN0YXRlSWQgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicsIHtvbjoge2NsaWNrOiBbU1RBVEVfTk9ERV9TRUxFQ1RFRCwgc3RhdGVJZF19LCBzdHlsZToge2N1cnNvcjogJ3BvaW50ZXInLCBmb250U2l6ZTogJzE0cHgnLCBjb2xvcjogJ3doaXRlJywgYm94U2hhZG93OiAnaW5zZXQgMCAwIDAgMnB4ICcgKyAoc3RhdGUuc2VsZWN0ZWRTdGF0ZU5vZGVJZCA9PT0gc3RhdGVJZCA/ICcjZWFiNjVjJzogJyM4MjgyODInKSAsIGJhY2tncm91bmQ6ICcjNDQ0JywgcGFkZGluZzogJzJweCA1cHgnLCBtYXJnaW5SaWdodDogJzVweCcsIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLCB0cmFuc2l0aW9uOiAnYWxsIDAuMnMnfX0sIHN0YXRlLmRlZmluaXRpb24uc3RhdGVbc3RhdGVJZF0udGl0bGUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtjb2xvcjogJyM4ZThlOGUnfX0sIGV2ZW50RGF0YS5wcmV2aW91c1N0YXRlW3N0YXRlSWRdLnRvU3RyaW5nKCkgKyAnIOKAk+KAuiAnKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdzcGFuJywgZXZlbnREYXRhLm11dGF0aW9uc1tzdGF0ZUlkXS50b1N0cmluZygpKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgIF0pXHJcbiAgICAgICAgY29uc3QgcmVuZGVyVmlld0NvbXBvbmVudCA9IGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgIGZsZXg6ICcxIGF1dG8nLFxyXG4gICAgICAgICAgICAgICAgLy9iYWNrZ3JvdW5kSW1hZ2U6ICdyYWRpYWwtZ3JhZGllbnQoYmxhY2sgMTUlLCB0cmFuc3BhcmVudCAxNiUpLCByYWRpYWwtZ3JhZGllbnQoYmxhY2sgMTUlLCB0cmFuc3BhcmVudCAxNiUpLCByYWRpYWwtZ3JhZGllbnQocmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA5ODAzOTIpIDE1JSwgdHJhbnNwYXJlbnQgMjAlKSwgcmFkaWFsLWdyYWRpZW50KHJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wOTgwMzkyKSAxNSUsIHRyYW5zcGFyZW50IDIwJSknLFxyXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZFBvc2l0aW9uWDogJzBweCwgOHB4LCAwcHgsIDhweCcsXHJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kUG9zaXRpb25ZOiAnMHB4LCA4cHgsIDFweCwgOXB4JyxcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjonIzMzMycsXHJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kU2l6ZTonMTZweCAxNnB4JyxcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6J3JlbGF0aXZlJyxcclxuICAgICAgICAgICAgICAgIG92ZXJmbG93OiAnYXV0bycsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSwgW1xyXG4gICAgICAgICAgICBoKCdkaXYnLCB7c3R5bGU6ICgoKT0+e1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9wTWVudUhlaWdodCA9IDc1XHJcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aExlZnQgPSB3aW5kb3cuaW5uZXJXaWR0aCAtICgoc3RhdGUubGVmdE9wZW4gPyBzdGF0ZS5lZGl0b3JMZWZ0V2lkdGg6IDApICsgKHN0YXRlLnJpZ2h0T3BlbiA/IHN0YXRlLmVkaXRvclJpZ2h0V2lkdGggOiAwKSlcclxuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodExlZnQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSB0b3BNZW51SGVpZ2h0XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBzdGF0ZS5mdWxsU2NyZWVuID8gJzEwMHZ3JyA6IHdpZHRoTGVmdCAtIDQwICsncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogc3RhdGUuZnVsbFNjcmVlbiA/ICcxMDB2aCcgOiBoZWlnaHRMZWZ0IC0gNDAgKyAncHgnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjZmZmZmZmJyxcclxuICAgICAgICAgICAgICAgICAgICB6SW5kZXg6IHN0YXRlLmZ1bGxTY3JlZW4gPyAnMjAwMCcgOiAnMTAwJyxcclxuICAgICAgICAgICAgICAgICAgICBib3hTaGFkb3c6ICdyZ2JhKDAsIDAsIDAsIDAuMjQ3MDU5KSAwcHggMTRweCA0NXB4LCByZ2JhKDAsIDAsIDAsIDAuMjE5NjA4KSAwcHggMTBweCAxOHB4JyxcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2ZpeGVkJyxcclxuICAgICAgICAgICAgICAgICAgICB0cmFuc2l0aW9uOiAnYWxsIDAuNXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvcDogc3RhdGUuZnVsbFNjcmVlbiA/ICcwcHgnIDogMjAgKyA3NSArICdweCcsXHJcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogc3RhdGUuZnVsbFNjcmVlbiA/ICcwcHgnIDogKHN0YXRlLmxlZnRPcGVuID9zdGF0ZS5lZGl0b3JMZWZ0V2lkdGggOiAwKSArIDIwICsgJ3B4JyxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkoKX0sIFtcclxuICAgICAgICAgICAgICAgIHN0YXRlLmZ1bGxTY3JlZW4gP1xyXG4gICAgICAgICAgICAgICAgICAgIGgoJ3NwYW4nLCB7c3R5bGU6IHtwb3NpdGlvbjogJ2ZpeGVkJywgcGFkZGluZzogJzEycHggMTBweCcsIHRvcDogJzAnLCByaWdodDogJzIwcHgnLCBib3JkZXI6ICcycHggc29saWQgIzMzMycsIGJvcmRlclRvcDogJ25vbmUnLCBiYWNrZ3JvdW5kOiAnIzQ0NCcsIGNvbG9yOiAnd2hpdGUnLCBvcGFjaXR5OiAnMC44JywgY3Vyc29yOiAncG9pbnRlcid9LCBvbjoge2NsaWNrOiBbRlVMTF9TQ1JFRU5fQ0xJQ0tFRCwgZmFsc2VdfX0sICdleGl0IGZ1bGwgc2NyZWVuJyk6XHJcbiAgICAgICAgICAgICAgICAgICAgaCgnc3BhbicpLFxyXG4gICAgICAgICAgICAgICAgaCgnZGl2Jywge3N0eWxlOiB7b3ZlcmZsb3c6ICdhdXRvJywgd2lkdGg6ICcxMDAlJywgaGVpZ2h0OiAnMTAwJSd9fSwgW2FwcC52ZG9tXSlcclxuICAgICAgICAgICAgXSlcclxuICAgICAgICBdKVxyXG4gICAgICAgIGNvbnN0IG1haW5Sb3dDb21wb25lbnQgPSBoKCdkaXYnLCB7XHJcbiAgICAgICAgICAgIHN0eWxlOiB7XHJcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiAnZmxleCcsXHJcbiAgICAgICAgICAgICAgICBmbGV4OiAnMScsXHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgIHJlbmRlclZpZXdDb21wb25lbnQsXHJcbiAgICAgICAgICAgIGxlZnRDb21wb25lbnQsXHJcbiAgICAgICAgICAgIHJpZ2h0Q29tcG9uZW50LFxyXG4gICAgICAgICAgICBzdGF0ZS5zZWxlY3RlZFZpZXdOb2RlLnJlZiA/IGdlbmVyYXRlRWRpdE5vZGVDb21wb25lbnQoKTogaCgnc3BhbicpXHJcbiAgICAgICAgXSlcclxuICAgICAgICBjb25zdCB2bm9kZSA9IGgoJ2RpdicsIHtcclxuICAgICAgICAgICAgc3R5bGU6IHtcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdmbGV4JyxcclxuICAgICAgICAgICAgICAgIGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdmaXhlZCcsXHJcbiAgICAgICAgICAgICAgICB0b3A6ICcwJyxcclxuICAgICAgICAgICAgICAgIHJpZ2h0OiAnMCcsXHJcbiAgICAgICAgICAgICAgICB3aWR0aDogJzEwMHZ3JyxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogJzEwMHZoJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LCBbXHJcbiAgICAgICAgICAgIHRvcENvbXBvbmVudCxcclxuICAgICAgICAgICAgbWFpblJvd0NvbXBvbmVudCxcclxuICAgICAgICAgICAgc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcgPyBoKCdkaXYnLCB7c3R5bGU6IHtmb250RmFtaWx5OiBcIk9wZW4gU2Fuc1wiLCBwb2ludGVyRXZlbnRzOiAnbm9uZScsIHBvc2l0aW9uOiAnZml4ZWQnLCB0b3A6IHN0YXRlLm1vdXNlUG9zaXRpb24ueSArICdweCcsIGxlZnQ6IHN0YXRlLm1vdXNlUG9zaXRpb24ueCArICdweCcsIGxpbmVIZWlnaHQ6ICcxLjJlbScsIGZvbnRTaXplOiAnMS4yZW0nLCB6SW5kZXg6ICc5OTk5OScsIHdpZHRoOiBzdGF0ZS5lZGl0b3JSaWdodFdpZHRoICsgJ3B4J319LCBbaCgnZGl2Jywge3N0eWxlOiB7b3ZlcmZsb3c6ICdhdXRvJywgcG9zaXRpb246ICdyZWxhdGl2ZScsIGZsZXg6ICcxJywgZm9udFNpemU6ICcwLjhlbSd9fSwgW2Zha2VDb21wb25lbnQoc3RhdGUuZHJhZ2dlZENvbXBvbmVudFZpZXcsIHN0YXRlLmhvdmVyZWRWaWV3Tm9kZSA/IHN0YXRlLmhvdmVyZWRWaWV3Tm9kZS5kZXB0aCA6IHN0YXRlLmRyYWdnZWRDb21wb25lbnRWaWV3LmRlcHRoKV0pXSk6IGgoJ3NwYW4nKSxcclxuICAgICAgICAgICAgc3RhdGUuZHJhZ2dlZENvbXBvbmVudFN0YXRlSWQgPyBoKCdkaXYnLCB7c3R5bGU6IHtmb250RmFtaWx5OiBcIk9wZW4gU2Fuc1wiLCBwb2ludGVyRXZlbnRzOiAnbm9uZScsIHBvc2l0aW9uOiAnZml4ZWQnLCB0b3A6IHN0YXRlLm1vdXNlUG9zaXRpb24ueSArICdweCcsIGxlZnQ6IHN0YXRlLm1vdXNlUG9zaXRpb24ueCArICdweCcsIGxpbmVIZWlnaHQ6ICcxLjJlbScsIGZvbnRTaXplOiAnMTZweCcsIHpJbmRleDogJzk5OTk5Jywgd2lkdGg6IHN0YXRlLmVkaXRvclJpZ2h0V2lkdGggKyAncHgnfX0sIFtmYWtlU3RhdGUoc3RhdGUuZHJhZ2dlZENvbXBvbmVudFN0YXRlSWQpXSk6IGgoJ3NwYW4nKSxcclxuICAgICAgICBdKVxyXG5cclxuICAgICAgICBub2RlID0gcGF0Y2gobm9kZSwgdm5vZGUpXHJcbiAgICAgICAgY3VycmVudEFuaW1hdGlvbkZyYW1lUmVxdWVzdCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmVuZGVyKClcclxufSIsImZ1bmN0aW9uIHVwZGF0ZVByb3BzKG9sZFZub2RlLCB2bm9kZSkge1xyXG4gICAgdmFyIGtleSwgY3VyLCBvbGQsIGVsbSA9IHZub2RlLmVsbSxcclxuICAgICAgICBwcm9wcyA9IHZub2RlLmRhdGEubGl2ZVByb3BzIHx8IHt9O1xyXG4gICAgZm9yIChrZXkgaW4gcHJvcHMpIHtcclxuICAgICAgICBjdXIgPSBwcm9wc1trZXldO1xyXG4gICAgICAgIG9sZCA9IGVsbVtrZXldO1xyXG4gICAgICAgIGlmIChvbGQgIT09IGN1cikgZWxtW2tleV0gPSBjdXI7XHJcbiAgICB9XHJcbn1cclxuY29uc3QgbGl2ZVByb3BzUGx1Z2luID0ge2NyZWF0ZTogdXBkYXRlUHJvcHMsIHVwZGF0ZTogdXBkYXRlUHJvcHN9O1xyXG5pbXBvcnQgc25hYmJkb20gZnJvbSAnc25hYmJkb20nXHJcbmNvbnN0IHBhdGNoID0gc25hYmJkb20uaW5pdChbXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL2NsYXNzJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL3Byb3BzJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL3N0eWxlJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL2V2ZW50bGlzdGVuZXJzJyksXHJcbiAgICByZXF1aXJlKCdzbmFiYmRvbS9tb2R1bGVzL2F0dHJpYnV0ZXMnKSxcclxuICAgIGxpdmVQcm9wc1BsdWdpblxyXG5dKTtcclxuaW1wb3J0IGggZnJvbSAnc25hYmJkb20vaCc7XHJcbmltcG9ydCBiaWcgZnJvbSAnYmlnLmpzJztcclxuXHJcbmZ1bmN0aW9uIGZsYXR0ZW4oYXJyKSB7XHJcbiAgICByZXR1cm4gYXJyLnJlZHVjZShmdW5jdGlvbiAoZmxhdCwgdG9GbGF0dGVuKSB7XHJcbiAgICAgICAgcmV0dXJuIGZsYXQuY29uY2F0KEFycmF5LmlzQXJyYXkodG9GbGF0dGVuKSA/IGZsYXR0ZW4odG9GbGF0dGVuKSA6IHRvRmxhdHRlbik7XHJcbiAgICB9LCBbXSk7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IChkZWZpbml0aW9uKSA9PiB7XHJcblxyXG4gICAgbGV0IGN1cnJlbnRTdGF0ZSA9IGNyZWF0ZURlZmF1bHRTdGF0ZSgpXHJcblxyXG4gICAgLy8gQWxsb3dzIHN0b3BpbmcgYXBwbGljYXRpb24gaW4gZGV2ZWxvcG1lbnQuIFRoaXMgaXMgbm90IGFuIGFwcGxpY2F0aW9uIHN0YXRlXHJcbiAgICBsZXQgZnJvemVuID0gZmFsc2VcclxuICAgIGxldCBmcm96ZW5DYWxsYmFjayA9IG51bGxcclxuICAgIGxldCBzZWxlY3RIb3ZlckFjdGl2ZSA9IGZhbHNlXHJcbiAgICBsZXQgc2VsZWN0ZWROb2RlSW5EZXZlbG9wbWVudCA9IHt9XHJcblxyXG4gICAgZnVuY3Rpb24gc2VsZWN0Tm9kZUhvdmVyKHJlZiwgZSkge1xyXG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICBzZWxlY3RlZE5vZGVJbkRldmVsb3BtZW50ID0gcmVmXHJcbiAgICAgICAgZnJvemVuQ2FsbGJhY2socmVmKVxyXG4gICAgICAgIHJlbmRlcigpXHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBzZWxlY3ROb2RlQ2xpY2socmVmLCBlKSB7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIHNlbGVjdEhvdmVyQWN0aXZlID0gZmFsc2VcclxuICAgICAgICBzZWxlY3RlZE5vZGVJbkRldmVsb3BtZW50ID0gcmVmXHJcbiAgICAgICAgZnJvemVuQ2FsbGJhY2socmVmKVxyXG4gICAgICAgIHJlbmRlcigpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gZ2xvYmFsIHN0YXRlIGZvciByZXNvbHZlclxyXG4gICAgbGV0IGN1cnJlbnRFdmVudCA9IG51bGxcclxuICAgIGxldCBjdXJyZW50TWFwVmFsdWUgPSB7fVxyXG4gICAgbGV0IGN1cnJlbnRNYXBJbmRleCA9IHt9XHJcbiAgICBsZXQgZXZlbnREYXRhID0ge31cclxuICAgIGZ1bmN0aW9uIHJlc29sdmUocmVmKXtcclxuICAgICAgICBpZihyZWYgPT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBzdGF0aWMgdmFsdWUgKHN0cmluZy9udW1iZXIpXHJcbiAgICAgICAgaWYocmVmLnJlZiA9PT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgcmV0dXJuIHJlZlxyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBkZWYgPSBkZWZpbml0aW9uW3JlZi5yZWZdW3JlZi5pZF1cclxuICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ3BpcGUnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwaXBlKHJlZilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlZi5yZWYgPT09ICdjb25kaXRpb25hbCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGVmLnByZWRpY2F0ZSkgPyByZXNvbHZlKGRlZi50aGVuKSA6IHJlc29sdmUoZGVmLmVsc2UpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZWYucmVmID09PSAnc3RhdGUnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50U3RhdGVbcmVmLmlkXVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ3ZOb2RlQm94Jykge1xyXG4gICAgICAgICAgICByZXR1cm4gYm94Tm9kZShyZWYpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZWYucmVmID09PSAndk5vZGVUZXh0Jykge1xyXG4gICAgICAgICAgICByZXR1cm4gdGV4dE5vZGUocmVmKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ3ZOb2RlSW5wdXQnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBpbnB1dE5vZGUocmVmKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ3ZOb2RlTGlzdCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxpc3ROb2RlKHJlZilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlZi5yZWYgPT09ICd2Tm9kZUlmJykge1xyXG4gICAgICAgICAgICByZXR1cm4gaWZOb2RlKHJlZilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlZi5yZWYgPT09ICd2Tm9kZUltYWdlJykge1xyXG4gICAgICAgICAgICByZXR1cm4gaW1hZ2VOb2RlKHJlZilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlZi5yZWYgPT09ICdzdHlsZScpIHtcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRlZikucmVkdWNlKChhY2MsIHZhbCk9PiB7XHJcbiAgICAgICAgICAgICAgICBhY2NbdmFsXSA9IHJlc29sdmUoZGVmW3ZhbF0pXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjXHJcbiAgICAgICAgICAgIH0sIHt9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ2V2ZW50RGF0YScpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGV2ZW50RGF0YVtyZWYuaWRdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZWYucmVmID09PSAnbGlzdFZhbHVlJykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3VycmVudE1hcFZhbHVlW2RlZi5saXN0LmlkXVtkZWYucHJvcGVydHldXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IEVycm9yKHJlZilcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZSwgdHJhbnNmb3JtYXRpb25zKXtcclxuICAgICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdHJhbnNmb3JtYXRpb25zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlZiA9IHRyYW5zZm9ybWF0aW9uc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBkZWZpbml0aW9uW3JlZi5yZWZdW3JlZi5pZF1cclxuICAgICAgICAgICAgaWYgKHJlZi5yZWYgPT09ICdlcXVhbCcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBhcmVWYWx1ZSA9IHJlc29sdmUodHJhbnNmb3JtZXIudmFsdWUpXHJcbiAgICAgICAgICAgICAgICBpZih2YWx1ZSBpbnN0YW5jZW9mIGJpZyB8fCBjb21wYXJlVmFsdWUgaW5zdGFuY2VvZiBiaWcpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gYmlnKHZhbHVlKS5lcShjb21wYXJlVmFsdWUpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PT0gY29tcGFyZVZhbHVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZi5yZWYgPT09ICdhZGQnKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGJpZyh2YWx1ZSkucGx1cyhyZXNvbHZlKHRyYW5zZm9ybWVyLnZhbHVlKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ3N1YnRyYWN0Jykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBiaWcodmFsdWUpLm1pbnVzKHJlc29sdmUodHJhbnNmb3JtZXIudmFsdWUpKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWYucmVmID09PSAnbXVsdGlwbHknKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGJpZyh2YWx1ZSkudGltZXMocmVzb2x2ZSh0cmFuc2Zvcm1lci52YWx1ZSkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZi5yZWYgPT09ICdkaXZpZGUnKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGJpZyh2YWx1ZSkuZGl2KHJlc29sdmUodHJhbnNmb3JtZXIudmFsdWUpKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWYucmVmID09PSAncmVtYWluZGVyJykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBiaWcodmFsdWUpLm1vZChyZXNvbHZlKHRyYW5zZm9ybWVyLnZhbHVlKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ2JyYW5jaCcpIHtcclxuICAgICAgICAgICAgICAgIGlmKHJlc29sdmUodHJhbnNmb3JtZXIucHJlZGljYXRlKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZSwgdHJhbnNmb3JtZXIudGhlbilcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZSwgdHJhbnNmb3JtZXIuZWxzZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ2pvaW4nKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmNvbmNhdChyZXNvbHZlKHRyYW5zZm9ybWVyLnZhbHVlKSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVmLnJlZiA9PT0gJ3RvVXBwZXJDYXNlJykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1VwcGVyQ2FzZSgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZi5yZWYgPT09ICd0b0xvd2VyQ2FzZScpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWYucmVmID09PSAndG9UZXh0Jykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBpcGUocmVmKSB7XHJcbiAgICAgICAgY29uc3QgZGVmID0gZGVmaW5pdGlvbltyZWYucmVmXVtyZWYuaWRdXHJcbiAgICAgICAgcmV0dXJuIHRyYW5zZm9ybVZhbHVlKHJlc29sdmUoZGVmLnZhbHVlKSwgZGVmLnRyYW5zZm9ybWF0aW9ucylcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmcm96ZW5TaGFkb3cgPSAnaW5zZXQgMCAwIDAgM3B4ICMzNTkwZGYnXHJcblxyXG4gICAgZnVuY3Rpb24gYm94Tm9kZShyZWYpIHtcclxuICAgICAgICBjb25zdCBub2RlID0gZGVmaW5pdGlvbltyZWYucmVmXVtyZWYuaWRdXHJcbiAgICAgICAgY29uc3Qgc3R5bGUgPSByZXNvbHZlKG5vZGUuc3R5bGUpXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IHtcclxuICAgICAgICAgICAgc3R5bGU6IGZyb3plbiAmJiBzZWxlY3RlZE5vZGVJbkRldmVsb3BtZW50LmlkID09PSByZWYuaWQgPyB7Li4uc3R5bGUsIHRyYW5zaXRpb246J2JveC1zaGFkb3cgMC4ycycsIGJveFNoYWRvdzogc3R5bGUuYm94U2hhZG93ID8gc3R5bGUuYm94U2hhZG93ICsgJyAsICcgKyBmcm96ZW5TaGFkb3c6IGZyb3plblNoYWRvdyB9IDogc3R5bGUsXHJcbiAgICAgICAgICAgIG9uOiBmcm96ZW4gP1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIG1vdXNlb3Zlcjogc2VsZWN0SG92ZXJBY3RpdmUgPyBbc2VsZWN0Tm9kZUhvdmVyLCByZWZdOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xpY2s6IFtzZWxlY3ROb2RlQ2xpY2ssIHJlZl1cclxuICAgICAgICAgICAgICAgIH06e1xyXG4gICAgICAgICAgICAgICAgICAgIGNsaWNrOiBub2RlLmNsaWNrID8gW2VtaXRFdmVudCwgbm9kZS5jbGlja10gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZGJsY2xpY2s6IG5vZGUuZGJsY2xpY2sgPyBbZW1pdEV2ZW50LCBub2RlLmRibGNsaWNrXSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBtb3VzZW92ZXI6IG5vZGUubW91c2VvdmVyID8gW2VtaXRFdmVudCwgbm9kZS5tb3VzZW92ZXJdIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vdXNlb3V0OiBub2RlLm1vdXNlb3V0ID8gW2VtaXRFdmVudCwgbm9kZS5tb3VzZW91dF0gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gaCgnZGl2JywgZGF0YSwgZmxhdHRlbihub2RlLmNoaWxkcmVuLm1hcChyZXNvbHZlKSkpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaWZOb2RlKHJlZikge1xyXG4gICAgICAgIGNvbnN0IG5vZGUgPSBkZWZpbml0aW9uW3JlZi5yZWZdW3JlZi5pZF1cclxuICAgICAgICByZXR1cm4gcmVzb2x2ZShub2RlLnZhbHVlKSA/IG5vZGUuY2hpbGRyZW4ubWFwKHJlc29sdmUpOiBbXVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHRleHROb2RlKHJlZikge1xyXG4gICAgICAgIGNvbnN0IG5vZGUgPSBkZWZpbml0aW9uW3JlZi5yZWZdW3JlZi5pZF1cclxuICAgICAgICBjb25zdCBzdHlsZSA9IHJlc29sdmUobm9kZS5zdHlsZSlcclxuICAgICAgICBjb25zdCBkYXRhID0ge1xyXG4gICAgICAgICAgICBzdHlsZTogZnJvemVuICYmIHNlbGVjdGVkTm9kZUluRGV2ZWxvcG1lbnQuaWQgPT09IHJlZi5pZCA/IHsuLi5zdHlsZSwgdHJhbnNpdGlvbjonYm94LXNoYWRvdyAwLjJzJywgYm94U2hhZG93OiBzdHlsZS5ib3hTaGFkb3cgPyBzdHlsZS5ib3hTaGFkb3cgKyAnICwgJyArIGZyb3plblNoYWRvdzogZnJvemVuU2hhZG93IH0gOiBzdHlsZSxcclxuICAgICAgICAgICAgb246IGZyb3plbiA/XHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW91c2VvdmVyOiBzZWxlY3RIb3ZlckFjdGl2ZSA/IFtzZWxlY3ROb2RlSG92ZXIsIHJlZl06IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBjbGljazogW3NlbGVjdE5vZGVDbGljaywgcmVmXVxyXG4gICAgICAgICAgICAgICAgfTp7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xpY2s6IG5vZGUuY2xpY2sgPyBbZW1pdEV2ZW50LCBub2RlLmNsaWNrXSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBkYmxjbGljazogbm9kZS5kYmxjbGljayA/IFtlbWl0RXZlbnQsIG5vZGUuZGJsY2xpY2tdIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vdXNlb3Zlcjogbm9kZS5tb3VzZW92ZXIgPyBbZW1pdEV2ZW50LCBub2RlLm1vdXNlb3Zlcl0gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbW91c2VvdXQ6IG5vZGUubW91c2VvdXQgPyBbZW1pdEV2ZW50LCBub2RlLm1vdXNlb3V0XSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBoKCdzcGFuJywgZGF0YSwgcmVzb2x2ZShub2RlLnZhbHVlKSlcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbWFnZU5vZGUocmVmKSB7XHJcbiAgICAgICAgY29uc3Qgbm9kZSA9IGRlZmluaXRpb25bcmVmLnJlZl1bcmVmLmlkXVxyXG4gICAgICAgIGNvbnN0IHN0eWxlID0gcmVzb2x2ZShub2RlLnN0eWxlKVxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSB7XHJcbiAgICAgICAgICAgIGF0dHJzOiB7XHJcbiAgICAgICAgICAgICAgICBzcmM6IHJlc29sdmUobm9kZS5zcmMpXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlOiBmcm96ZW4gJiYgc2VsZWN0ZWROb2RlSW5EZXZlbG9wbWVudC5pZCA9PT0gcmVmLmlkID8gey4uLnN0eWxlLCB0cmFuc2l0aW9uOidib3gtc2hhZG93IDAuMnMnLCBib3hTaGFkb3c6IHN0eWxlLmJveFNoYWRvdyA/IHN0eWxlLmJveFNoYWRvdyArICcgLCAnICsgZnJvemVuU2hhZG93OiBmcm96ZW5TaGFkb3cgfSA6IHN0eWxlLFxyXG4gICAgICAgICAgICBvbjogZnJvemVuID9cclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBtb3VzZW92ZXI6IHNlbGVjdEhvdmVyQWN0aXZlID8gW3NlbGVjdE5vZGVIb3ZlciwgcmVmXTogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsaWNrOiBbc2VsZWN0Tm9kZUNsaWNrLCByZWZdXHJcbiAgICAgICAgICAgICAgICB9OntcclxuICAgICAgICAgICAgICAgICAgICBjbGljazogbm9kZS5jbGljayA/IFtlbWl0RXZlbnQsIG5vZGUuY2xpY2tdIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRibGNsaWNrOiBub2RlLmRibGNsaWNrID8gW2VtaXRFdmVudCwgbm9kZS5kYmxjbGlja10gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbW91c2VvdmVyOiBub2RlLm1vdXNlb3ZlciA/IFtlbWl0RXZlbnQsIG5vZGUubW91c2VvdmVyXSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBtb3VzZW91dDogbm9kZS5tb3VzZW91dCA/IFtlbWl0RXZlbnQsIG5vZGUubW91c2VvdXRdIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGgoJ2ltZycsIGRhdGEpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5wdXROb2RlKHJlZikge1xyXG4gICAgICAgIGNvbnN0IG5vZGUgPSBkZWZpbml0aW9uW3JlZi5yZWZdW3JlZi5pZF1cclxuICAgICAgICBjb25zdCBzdHlsZSA9IHJlc29sdmUobm9kZS5zdHlsZSlcclxuICAgICAgICBjb25zdCBkYXRhID0ge1xyXG4gICAgICAgICAgICBzdHlsZTogZnJvemVuICYmIHNlbGVjdGVkTm9kZUluRGV2ZWxvcG1lbnQuaWQgPT09IHJlZi5pZCA/IHsuLi5zdHlsZSwgdHJhbnNpdGlvbjonYm94LXNoYWRvdyAwLjJzJywgYm94U2hhZG93OiBzdHlsZS5ib3hTaGFkb3cgPyBzdHlsZS5ib3hTaGFkb3cgKyAnICwgJyArIGZyb3plblNoYWRvdzogZnJvemVuU2hhZG93IH0gOiBzdHlsZSxcclxuICAgICAgICAgICAgb246IGZyb3plbiA/XHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW91c2VvdmVyOiBzZWxlY3RIb3ZlckFjdGl2ZSA/IFtzZWxlY3ROb2RlSG92ZXIsIHJlZl06IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBjbGljazogW3NlbGVjdE5vZGVDbGljaywgcmVmXVxyXG4gICAgICAgICAgICAgICAgfTp7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xpY2s6IG5vZGUuY2xpY2sgPyBbZW1pdEV2ZW50LCBub2RlLmNsaWNrXSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dDogbm9kZS5pbnB1dCA/IFtlbWl0RXZlbnQsIG5vZGUuaW5wdXRdIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRibGNsaWNrOiBub2RlLmRibGNsaWNrID8gW2VtaXRFdmVudCwgbm9kZS5kYmxjbGlja10gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbW91c2VvdmVyOiBub2RlLm1vdXNlb3ZlciA/IFtlbWl0RXZlbnQsIG5vZGUubW91c2VvdmVyXSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgICAgICBtb3VzZW91dDogbm9kZS5tb3VzZW91dCA/IFtlbWl0RXZlbnQsIG5vZGUubW91c2VvdXRdIDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzOiBub2RlLmZvY3VzID8gW2VtaXRFdmVudCwgbm9kZS5mb2N1c10gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgYmx1cjogbm9kZS5ibHVyID8gW2VtaXRFdmVudCwgbm9kZS5ibHVyXSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHByb3BzOiB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVzb2x2ZShub2RlLnZhbHVlKSxcclxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBub2RlLnBsYWNlaG9sZGVyXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGgoJ2lucHV0JywgZGF0YSlcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBsaXN0Tm9kZShyZWYpIHtcclxuICAgICAgICBjb25zdCBub2RlID0gZGVmaW5pdGlvbltyZWYucmVmXVtyZWYuaWRdXHJcbiAgICAgICAgY29uc3QgbGlzdCA9IHJlc29sdmUobm9kZS52YWx1ZSlcclxuXHJcbiAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBPYmplY3Qua2V5cyhsaXN0KS5tYXAoa2V5PT5saXN0W2tleV0pLm1hcCgodmFsdWUsIGluZGV4KT0+IHtcclxuICAgICAgICAgICAgY3VycmVudE1hcFZhbHVlW3JlZi5pZF0gPSB2YWx1ZVxyXG4gICAgICAgICAgICBjdXJyZW50TWFwSW5kZXhbcmVmLmlkXSA9IGluZGV4XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbm9kZS5jaGlsZHJlbi5tYXAocmVzb2x2ZSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIGRlbGV0ZSBjdXJyZW50TWFwVmFsdWVbcmVmLmlkXTtcclxuICAgICAgICBkZWxldGUgY3VycmVudE1hcEluZGV4W3JlZi5pZF07XHJcblxyXG4gICAgICAgIHJldHVybiBjaGlsZHJlblxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxpc3RlbmVycyA9IFtdXHJcblxyXG4gICAgZnVuY3Rpb24gYWRkTGlzdGVuZXIoY2FsbGJhY2spIHtcclxuICAgICAgICBjb25zdCBsZW5ndGggPSBsaXN0ZW5lcnMucHVzaChjYWxsYmFjaylcclxuXHJcbiAgICAgICAgLy8gZm9yIHVuc3Vic2NyaWJpbmdcclxuICAgICAgICByZXR1cm4gKCkgPT4gbGlzdGVuZXJzLnNwbGljZShsZW5ndGggLSAxLCAxKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGVtaXRFdmVudChldmVudFJlZiwgZSkge1xyXG4gICAgICAgIGNvbnN0IGV2ZW50SWQgPSBldmVudFJlZi5pZFxyXG4gICAgICAgIGNvbnN0IGV2ZW50ID0gZGVmaW5pdGlvbi5ldmVudFtldmVudElkXVxyXG4gICAgICAgIGN1cnJlbnRFdmVudCA9IGVcclxuICAgICAgICBldmVudC5kYXRhLmZvckVhY2goKHJlZik9PntcclxuICAgICAgICAgICAgaWYocmVmLmlkID09PSAnX2lucHV0Jyl7XHJcbiAgICAgICAgICAgICAgICBldmVudERhdGFbcmVmLmlkXSA9IGUudGFyZ2V0LnZhbHVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIGNvbnN0IHByZXZpb3VzU3RhdGUgPSBjdXJyZW50U3RhdGVcclxuICAgICAgICBsZXQgbXV0YXRpb25zID0ge31cclxuICAgICAgICBkZWZpbml0aW9uLmV2ZW50W2V2ZW50SWRdLm11dGF0b3JzLmZvckVhY2goKHJlZik9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG11dGF0b3IgPSBkZWZpbml0aW9uLm11dGF0b3JbcmVmLmlkXVxyXG4gICAgICAgICAgICBjb25zdCBzdGF0ZSA9IG11dGF0b3Iuc3RhdGVcclxuICAgICAgICAgICAgbXV0YXRpb25zW3N0YXRlLmlkXSA9IHJlc29sdmUobXV0YXRvci5tdXRhdGlvbilcclxuICAgICAgICB9KVxyXG4gICAgICAgIGN1cnJlbnRTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIGN1cnJlbnRTdGF0ZSwgbXV0YXRpb25zKVxyXG4gICAgICAgIGxpc3RlbmVycy5mb3JFYWNoKGNhbGxiYWNrID0+IGNhbGxiYWNrKGV2ZW50SWQsIGV2ZW50RGF0YSwgZSwgcHJldmlvdXNTdGF0ZSwgY3VycmVudFN0YXRlLCBtdXRhdGlvbnMpKVxyXG4gICAgICAgIGN1cnJlbnRFdmVudCA9IHt9XHJcbiAgICAgICAgZXZlbnREYXRhID0ge31cclxuICAgICAgICBpZihPYmplY3Qua2V5cyhtdXRhdGlvbnMpLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJlbmRlcigpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCB2ZG9tID0gcmVzb2x2ZSh7cmVmOid2Tm9kZUJveCcsIGlkOidfcm9vdE5vZGUnfSlcclxuICAgIGZ1bmN0aW9uIHJlbmRlcihuZXdEZWZpbml0aW9uKSB7XHJcbiAgICAgICAgaWYobmV3RGVmaW5pdGlvbil7XHJcbiAgICAgICAgICAgIGlmKGRlZmluaXRpb24uc3RhdGUgIT09IG5ld0RlZmluaXRpb24uc3RhdGUpe1xyXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbiA9IG5ld0RlZmluaXRpb25cclxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gT2JqZWN0LmtleXMoZGVmaW5pdGlvbi5zdGF0ZSkubWFwKGtleT0+ZGVmaW5pdGlvbi5zdGF0ZVtrZXldKS5yZWR1Y2UoKGFjYywgZGVmKT0+IHtcclxuICAgICAgICAgICAgICAgICAgICBhY2NbZGVmLnJlZl0gPSBkZWYuZGVmYXVsdFZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFjY1xyXG4gICAgICAgICAgICAgICAgfSwge30pXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50U3RhdGUgPSB7Li4ubmV3U3RhdGUsIC4uLmN1cnJlbnRTdGF0ZX1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGRlZmluaXRpb24gPSBuZXdEZWZpbml0aW9uXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgbmV3dmRvbSA9IHJlc29sdmUoe3JlZjondk5vZGVCb3gnLCBpZDonX3Jvb3ROb2RlJ30pXHJcbiAgICAgICAgcGF0Y2godmRvbSwgbmV3dmRvbSlcclxuICAgICAgICB2ZG9tID0gbmV3dmRvbVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIF9mcmVlemUoaXNGcm96ZW4sIGNhbGxiYWNrLCBub2RlSWQpIHtcclxuICAgICAgICBmcm96ZW5DYWxsYmFjayA9IGNhbGxiYWNrXHJcbiAgICAgICAgc2VsZWN0ZWROb2RlSW5EZXZlbG9wbWVudCA9IG5vZGVJZFxyXG4gICAgICAgIGlmKGZyb3plbiA9PT0gZmFsc2UgJiYgaXNGcm96ZW4gPT09IHRydWUpe1xyXG4gICAgICAgICAgICBzZWxlY3RIb3ZlckFjdGl2ZSA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZnJvemVuIHx8IGZyb3plbiAhPT0gaXNGcm96ZW4pe1xyXG4gICAgICAgICAgICBmcm96ZW4gPSBpc0Zyb3plblxyXG4gICAgICAgICAgICByZW5kZXIoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRDdXJyZW50U3RhdGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRTdGF0ZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldEN1cnJlbnRTdGF0ZShuZXdTdGF0ZSkge1xyXG4gICAgICAgIGN1cnJlbnRTdGF0ZSA9IG5ld1N0YXRlXHJcbiAgICAgICAgcmVuZGVyKClcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVEZWZhdWx0U3RhdGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGRlZmluaXRpb24uc3RhdGUpLm1hcChrZXk9PmRlZmluaXRpb24uc3RhdGVba2V5XSkucmVkdWNlKChhY2MsIGRlZik9PiB7XHJcbiAgICAgICAgICAgIGFjY1tkZWYucmVmXSA9IGRlZi5kZWZhdWx0VmFsdWVcclxuICAgICAgICAgICAgcmV0dXJuIGFjY1xyXG4gICAgICAgIH0sIHt9KVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgZGVmaW5pdGlvbixcclxuICAgICAgICB2ZG9tLFxyXG4gICAgICAgIGdldEN1cnJlbnRTdGF0ZSxcclxuICAgICAgICBzZXRDdXJyZW50U3RhdGUsXHJcbiAgICAgICAgcmVuZGVyLFxyXG4gICAgICAgIGVtaXRFdmVudCxcclxuICAgICAgICBhZGRMaXN0ZW5lcixcclxuICAgICAgICBfZnJlZXplLFxyXG4gICAgICAgIF9yZXNvbHZlOiByZXNvbHZlLFxyXG4gICAgICAgIGNyZWF0ZURlZmF1bHRTdGF0ZVxyXG4gICAgfVxyXG59IiwibW9kdWxlLmV4cG9ydHM9e1xyXG4gIFwiZXZlbnREYXRhXCI6IHtcclxuICAgIFwiX2lucHV0XCI6IHtcclxuICAgICAgXCJ0aXRsZVwiOiBcImlucHV0IHZhbHVlXCIsXHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIlxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJ0b0xvd2VyQ2FzZVwiOiB7fSxcclxuICBcInRvVXBwZXJDYXNlXCI6IHt9LFxyXG4gIFwiY29uZGl0aW9uYWxcIjoge30sXHJcbiAgXCJlcXVhbFwiOiB7XHJcbiAgICBcImE3MjUxYWYwLTUwYTctNDgyMy04NWEwLTY2Y2UwOWQ4YTNjY1wiOiB7XHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJlZTI0MjNlNi01YjQ4LTQxYWUtOGNjZi02YTJjN2I0NmQyZjhcIlxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBcIm5vdFwiOiB7fSxcclxuICBcImxpc3RcIjoge30sXHJcbiAgXCJ0b1RleHRcIjoge1xyXG4gICAgXCI3YnM5ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge31cclxuICB9LFxyXG4gIFwibGlzdFZhbHVlXCI6IHtcclxuICAgIFwicHo3aGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXHJcbiAgICAgIFwibGlzdFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZUxpc3RcIixcclxuICAgICAgICBcImlkXCI6IFwiZmw4OWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI1XCJcclxuICAgICAgfSxcclxuICAgICAgXCJwcm9wZXJ0eVwiOiBcInhcIlxyXG4gICAgfSxcclxuICAgIFwiaGo5d2Q2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXHJcbiAgICAgIFwibGlzdFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZUxpc3RcIixcclxuICAgICAgICBcImlkXCI6IFwiZmw4OWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI1XCJcclxuICAgICAgfSxcclxuICAgICAgXCJwcm9wZXJ0eVwiOiBcInlcIlxyXG4gICAgfSxcclxuICAgIFwiaGhyOGI2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcImxpc3RcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwidk5vZGVMaXN0XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImZsODlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwicHJvcGVydHlcIjogXCJjb2xvclwiXHJcbiAgICB9XHJcbiAgfSxcclxuICBcInBpcGVcIjoge1xyXG4gICAgXCJmdzhqZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJOdW1iZXIgY3VycmVudGx5IGlzOiBcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwiam9pblwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcInA5czNkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcImpvaW5cIixcclxuICAgICAgICAgIFwiaWRcIjogXCI4YTZjZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgIFwidW01ZWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInN0YXRlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjQ2dmRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcInRvVGV4dFwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcIjdiczlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9LFxyXG4gICAgXCJ1aThqZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIrXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJjOHdlZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCItXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJwZHE2ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJudW1iZXJcIixcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJzdGF0ZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI0NnZkZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJhZGRcIixcclxuICAgICAgICAgIFwiaWRcIjogXCJ3ODZmZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgIFwiNDUycWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwic3RhdGVcIixcclxuICAgICAgICBcImlkXCI6IFwiNDZ2ZGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwic3VidHJhY3RcIixcclxuICAgICAgICAgIFwiaWRcIjogXCJ1NDN3ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgIFwiZXc4M2Q2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXHJcbiAgICAgIFwidmFsdWVcIjogMSxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcInczZTlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiLFxyXG4gICAgICBcInZhbHVlXCI6IDEsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCIzcWtpZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogMCxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwiYWRkXCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwid2JyN2Q2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwidG9UZXh0XCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwibm9vcFwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcImpvaW5cIixcclxuICAgICAgICAgIFwiaWRcIjogXCJzMjU4ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgIFwidDd2cWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IDAsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcImFkZFwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcInZxOGRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcInRvVGV4dFwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcIm5vb3BcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJqb2luXCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwid2Y5YWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH0sXHJcbiAgICBcIjdkYnZkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJsaXN0VmFsdWVcIixcclxuICAgICAgICBcImlkXCI6IFwiaGo5d2Q2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjhkNHZkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJsaXN0VmFsdWVcIixcclxuICAgICAgICBcImlkXCI6IFwicHo3aGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjhjcTZiNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJsaXN0VmFsdWVcIixcclxuICAgICAgICBcImlkXCI6IFwiaGhyOGI2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcImY5cXhkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRhYmxlXCIsXHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwic3RhdGVcIixcclxuICAgICAgICBcImlkXCI6IFwiYzhxOWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcInF3dzlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcInB4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJxZHc3YzZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiODQzNjlhYmEtNGE0ZC00OTMyLThhOWEtOGY5Y2E5NDhiNmEyXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiVGhlIG51bWJlciBpcyBldmVuIPCfjolcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcImMyZmI5YTliLTI1YmItNGU4Yi04MGMwLWNmNTFiODUwNjA3MFwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIixcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJzdGF0ZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI0NnZkZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJyZW1haW5kZXJcIixcclxuICAgICAgICAgIFwiaWRcIjogXCIzNDc4MGQyMi1mNTIxLTRjMzAtODlhNS0zZTdmNWI1YWY3YzJcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJlcXVhbFwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcImE3MjUxYWYwLTUwYTctNDgyMy04NWEwLTY2Y2UwOWQ4YTNjY1wiXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9LFxyXG4gICAgXCIxMjI5ZDQ3OC1iYzI1LTQ0MDEtOGE4OS03NGZjNmNmZTg5OTZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJudW1iZXJcIixcclxuICAgICAgXCJ2YWx1ZVwiOiAyLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiZWUyNDIzZTYtNWI0OC00MWFlLThjY2YtNmEyYzdiNDZkMmY4XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXHJcbiAgICAgIFwidmFsdWVcIjogMCxcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjk0NWYwODE4LTc3NDMtNGVkZC04Yzc2LTNkZDVhOGJhN2ZhOVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIidDb21mb3J0YWEnLCBjdXJzaXZlXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJhNjA4OTllZS05OTI1LTRlMDUtODkwZS1iOTQyOGIwMmRiZjlcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIjZjVmNWY1XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCIxZTQ2NTQwMy01MzgyLTRhNDUtODlkYS04ZDg4ZTJlYjJmYjlcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMDAlXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJlZjJlYzE4NC0xOTlmLTRlZTgtOGUzMC1iOTlkYmMxZGY1ZGJcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMHB4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJmYWIyODZjNC1kZWQzLTRhNWUtODc0OS03Njc4YWJjYmIxMjVcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMHB4IDVweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiNzAzZjhlMDItYzVjMy00ZDI3LThjYTItNzIyYzRkMGQxZWEwXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweCAxNXB4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCI4ZjNjNjYzMC1kOGQ5LTRiYzEtOGEzZC1iYTRkYWQzMDkxZjBcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIjYWFhYWFhXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJkMzFjNDc0Ni0yMzI5LTQ0MDQtODY4OS1mYmYyMzkzZWZkNDRcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJpbmxpbmUtYmxvY2tcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjQxNjg1YWRjLTM3OTMtNDU2Ni04ZjYxLTJjMmE0MmZkZjg2ZVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIjVweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiZDU3NTRmZGItNDY4OS00Zjg3LTg3ZmMtNTFkNjAwMjJiMzJjXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiM3B4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCIwYmM2YTE4Yy0xNzY2LTQyYmQtOGI0YS0yMDJhMmIwYzM0ZmVcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJwb2ludGVyXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCI5YjI1MGVmOC1jMWJlLTQ3MDYtOGE3MS1mNDQ0ZjE4ZjBmODJcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJub25lXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJiMGExMDQ5Ny1lYzI2LTRmZjctODczOS1hMTkzNzU1Y2JjYWVcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMHB4IDVweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiODc2NGUyNTgtNTk5ZC00MjUyLTgxMTItZDA2ZmNkMGQ1ZTJhXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweCAxNXB4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCI4Y2FhZjg3Ni0xMGJjLTQ3ZGUtODlkOS04NjljODkyY2Q0Y2VcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIjOTk5OTk5XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJhZTk4N2JiYS03MzRhLTQ2YWUtOGM4Mi1jMDQ4OTYyMjExNzlcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJpbmxpbmUtYmxvY2tcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcImYwMDkwZjhkLTg3YjQtNGQ4My04YTUzLTAzOWIyMWUyYjU5NFwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIjVweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiYjdjNzkxYTYtMmM5MS00YjYyLTg4MjAtZGJhYWY5ZDVjMTc5XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiM3B4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJkNzk1YTUxMC1jY2Y5LTRkOTItODFlZS01ZTUxMmI4MWVlNThcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJwb2ludGVyXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCI3NTE4NTI0YS0wYmMyLTQ2NWMtODE0ZS0wYTVkMzlkZTI1ZTNcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMHB4IDVweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiYjI0YjFjMTgtOGE4Mi00YzhmLTgxODAtNmQwNjJjNzhjOWQ5XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwibm9uZVwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiNjdmNzBkOTctYTM0Ni00MmU0LTgzM2YtNmVhZWFlZWQ0ZmVmXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweCAxMHB4IDEwcHggMFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiOTgyNTc0NjEtOTI4ZS00ZmY5LThhYzUtMGI4OTI5OGU0ZWYxXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweCAxMHB4IDEwcHggMFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiOTkzMWZlNmEtMDc0ZS00Y2I3LTgzNTUtYzE4ZDgxODY3OWE3XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiNzJiNTU5ZTktMjU0Ni00YmFlLThhNjEtNTU1NTY3MzYzYjExXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwicmlnaHRcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjMwZjhjNzAxLTdhZGYtNDM5OC04NjJlLTU1MzcyZTI5YzE0ZFwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIjUwcHhcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjY2MzVkYmIyLWIzNjQtNGVmZC04MDYxLTI2NDMyMDA3ZWIxYVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcInJpZ2h0XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCIwNDJjY2Y3ZC04MTliLTRmYWMtODI4Mi0yZjE5MDY5YjUzODZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCI1MDBweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiZTdiYzZlMjAtMTUxMC00YmFjLTg1OWYtMDRlYzNkY2RhNjZiXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMS41XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJlZjhkYzljNi1mMzMzLTRiNjEtOGQyNS1kMzZhZmU1MTc1MjBcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMHB4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCI3NTVhNzBhMi1kMTgxLTRmYWYtODU5My01YWI3NjAxMTU4ZjlcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJibG9ja1wiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiOWY1MDFjMzUtNTRiMy00YzYwLThmYzQtZDZhNDVlNzc2ZWIzXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiZThhY2M2YjAtZDFkZS00NDNiLTgxMjgtZGY2YjUxODZmNzBjXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiYmxvY2tcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjcxNzY0MzYyLWUwOWEtNDQxMi04ZmJjLWVkM2NiNGQ0Yzk1NFwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIjEwcHhcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcImMxOTliMTkxLTg4ZDItNDYzZC04NTY0LTFjZTFhMTYzMWIyZFwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcImJsb2NrXCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCJiMjExN2U2Yi1hY2U3LTRlNzUtOGU3ZC0zMjM2NjhkMWIxOWRcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCIxMHB4XCIsXHJcbiAgICAgIFwidHJhbnNmb3JtYXRpb25zXCI6IFtdXHJcbiAgICB9LFxyXG4gICAgXCI4YTUzODQ4ZC04YzdkLTQ0ZGMtOGQxMy1hZTA2MDEwN2M4MGJcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJ0ZXh0XCIsXHJcbiAgICAgIFwidmFsdWVcIjogXCJibG9ja1wiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiMTkwNmI1YjQtNjAyNC00OGYxLTg0ZGEtYzMzMmU1NTVhZmIzXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiMTBweFwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiYTU2NTY5NmQtOGE2MC00MTZlLTg0NGEtNjBjOGYyZmU4YzVhXCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiYmxvY2tcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjE1ZDQ3YjA3LTM5NmMtNGMwMy04NTkxLWY0NzI1OThmMTVlMlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIjEwcHhcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcImE4ZjVjMWNlLTc4M2ItNDYyNi04MjZhLTQ3M2FiNDM0YzBiMlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIjEwcHhcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcImE5Y3c5YTliLTI1YmItNGU4Yi04MGMwLWNmNTFiODUwNjA3MFwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcImh0dHBzOi8vdXBsb2FkLndpa2ltZWRpYS5vcmcvd2lraXBlZGlhL2NvbW1vbnMvdGh1bWIvOS85YS9TY2hvbmFjaF8tX1BhcmFkaWVzXy1fU29ubmVuYXVmZ2FuZy5qcGcvMTI4MHB4LVNjaG9uYWNoXy1fUGFyYWRpZXNfLV9Tb25uZW5hdWZnYW5nLmpwZ1wiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfSxcclxuICAgIFwiZDEzMTQyNzQtNWVmYy00YmUxLTgzMGItMGZmOGM5MmI1MDI5XCI6IHtcclxuICAgICAgXCJ0eXBlXCI6IFwidGV4dFwiLFxyXG4gICAgICBcInZhbHVlXCI6IFwiYmxvY2tcIixcclxuICAgICAgXCJ0cmFuc2Zvcm1hdGlvbnNcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjlxYzg0Mjc0LTVlZmMtNGJlMS04MzBiLTBmZjhjOTJiNTAyOVwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcInRleHRcIixcclxuICAgICAgXCJ2YWx1ZVwiOiBcIlwiLFxyXG4gICAgICBcInRyYW5zZm9ybWF0aW9uc1wiOiBbXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJqb2luXCI6IHtcclxuICAgIFwicDlzM2Q2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcInVtNWVkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIndmOWFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJxd3c5ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgXCJzMjU4ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInZhbHVlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwicWR3N2M2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiOGE2Y2Q2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjlxYzg0Mjc0LTVlZmMtNGJlMS04MzBiLTBmZjhjOTJiNTAyOVwiXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIFwiYWRkXCI6IHtcclxuICAgIFwidzg2ZmQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImV3ODNkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIndicjdkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI4ZDR2ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgXCJ2cThkZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInZhbHVlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiN2RidmQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJzdWJ0cmFjdFwiOiB7XHJcbiAgICBcInU0M3dkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJ3M2U5ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBcInJlbWFpbmRlclwiOiB7XHJcbiAgICBcIjM0NzgwZDIyLWY1MjEtNGMzMC04OWE1LTNlN2Y1YjVhZjdjMlwiOiB7XHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCIxMjI5ZDQ3OC1iYzI1LTQ0MDEtOGE4OS03NGZjNmNmZTg5OTZcIlxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBcInZOb2RlQm94XCI6IHtcclxuICAgIFwiX3Jvb3ROb2RlXCI6IHtcclxuICAgICAgXCJ0aXRsZVwiOiBcImFwcFwiLFxyXG4gICAgICBcInN0eWxlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInN0eWxlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIl9yb290U3R5bGVcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInBhcmVudFwiOiB7fSxcclxuICAgICAgXCJjaGlsZHJlblwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZVRleHRcIixcclxuICAgICAgICAgIFwiaWRcIjogXCIyNDcxZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjVcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZVRleHRcIixcclxuICAgICAgICAgIFwiaWRcIjogXCIxNDgxZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjVcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZVRleHRcIixcclxuICAgICAgICAgIFwiaWRcIjogXCIzNDgxZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjVcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZUlmXCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwiNTc4N2MxNWEtNDI2Yi00MWViLTgzMWQtZTNlMDc0MTU5NTgyXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwidk5vZGVJbWFnZVwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcInNkOHZjMTVhLTQyNmItNDFlYi04MzFkLWUzZTA3NDE1OTU4MlwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcInZOb2RlTGlzdFwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcImZsODlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNVwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9LFxyXG4gICAgXCJndzlkZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInRpdGxlXCI6IFwiYm94XCIsXHJcbiAgICAgIFwic3R5bGVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwic3R5bGVcIixcclxuICAgICAgICBcImlkXCI6IFwiZnE5ZGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJwYXJlbnRcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwidk5vZGVMaXN0XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImZsODlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiY2hpbGRyZW5cIjogW11cclxuICAgIH1cclxuICB9LFxyXG4gIFwidk5vZGVUZXh0XCI6IHtcclxuICAgIFwiMjQ3MWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI1XCI6IHtcclxuICAgICAgXCJ0aXRsZVwiOiBcIk51bWJlciBjdXJyZW50bHlcIixcclxuICAgICAgXCJzdHlsZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJzdHlsZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI4NDgxZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInBhcmVudFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZUJveFwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJfcm9vdE5vZGVcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInZhbHVlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiZnc4amQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiMTQ4MWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI1XCI6IHtcclxuICAgICAgXCJ0aXRsZVwiOiBcIisgYnV0dG9uXCIsXHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJ1aThqZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInN0eWxlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInN0eWxlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjk0ODFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwicGFyZW50XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInZOb2RlQm94XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIl9yb290Tm9kZVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiY2xpY2tcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwiZXZlbnRcIixcclxuICAgICAgICBcImlkXCI6IFwiZDQ4cmQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiMzQ4MWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI1XCI6IHtcclxuICAgICAgXCJ0aXRsZVwiOiBcIi0gYnV0dG9uXCIsXHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJjOHdlZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInN0eWxlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInN0eWxlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjc0ODFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwicGFyZW50XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInZOb2RlQm94XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIl9yb290Tm9kZVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiY2xpY2tcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwiZXZlbnRcIixcclxuICAgICAgICBcImlkXCI6IFwiM2E1NGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiZThhZGQxYzctOGEwMS00MTY0LTg2MDQtNzIyZDhhYjUyOWYxXCI6IHtcclxuICAgICAgXCJ0aXRsZVwiOiBcImlzIGV2ZW5cIixcclxuICAgICAgXCJzdHlsZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJzdHlsZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI0ZGNhNzNiMy05MGViLTQxZTctODY1MS0yYmRjYzkzZjM4NzFcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInBhcmVudFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZUlmXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjU3ODdjMTVhLTQyNmItNDFlYi04MzFkLWUzZTA3NDE1OTU4MlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwidmFsdWVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI4NDM2OWFiYS00YTRkLTQ5MzItOGE5YS04ZjljYTk0OGI2YTJcIlxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBcInZOb2RlSW5wdXRcIjoge30sXHJcbiAgXCJ2Tm9kZUxpc3RcIjoge1xyXG4gICAgXCJmbDg5ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjVcIjoge1xyXG4gICAgICBcInRpdGxlXCI6IFwibGlzdCBvZiBib3hlc1wiLFxyXG4gICAgICBcInZhbHVlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiZjlxeGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJwYXJlbnRcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwidk5vZGVCb3hcIixcclxuICAgICAgICBcImlkXCI6IFwiX3Jvb3ROb2RlXCJcclxuICAgICAgfSxcclxuICAgICAgXCJjaGlsZHJlblwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJ2Tm9kZUJveFwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcImd3OWRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9XHJcbiAgfSxcclxuICBcInZOb2RlSWZcIjoge1xyXG4gICAgXCI1Nzg3YzE1YS00MjZiLTQxZWItODMxZC1lM2UwNzQxNTk1ODJcIjoge1xyXG4gICAgICBcInRpdGxlXCI6IFwiaXMgbnVtYmVyIGV2ZW5cIixcclxuICAgICAgXCJ2YWx1ZVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImMyZmI5YTliLTI1YmItNGU4Yi04MGMwLWNmNTFiODUwNjA3MFwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwicGFyZW50XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInZOb2RlQm94XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIl9yb290Tm9kZVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiY2hpbGRyZW5cIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwidk5vZGVUZXh0XCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwiZThhZGQxYzctOGEwMS00MTY0LTg2MDQtNzIyZDhhYjUyOWYxXCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIFwidk5vZGVJbWFnZVwiOiB7XHJcbiAgICBcInNkOHZjMTVhLTQyNmItNDFlYi04MzFkLWUzZTA3NDE1OTU4MlwiOiB7XHJcbiAgICAgIFwidGl0bGVcIjogXCJoaWxsc1wiLFxyXG4gICAgICBcInNyY1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImE5Y3c5YTliLTI1YmItNGU4Yi04MGMwLWNmNTFiODUwNjA3MFwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwicGFyZW50XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInZOb2RlQm94XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIl9yb290Tm9kZVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwic3R5bGVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwic3R5bGVcIixcclxuICAgICAgICBcImlkXCI6IFwid2Y4ZDczYjMtOTBlYi00MWU3LTg2NTEtMmJkY2M5M2YzODcxXCJcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJzdHlsZVwiOiB7XHJcbiAgICBcIl9yb290U3R5bGVcIjoge1xyXG4gICAgICBcImZvbnRGYW1pbHlcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCI5NDVmMDgxOC03NzQzLTRlZGQtOGM3Ni0zZGQ1YThiYTdmYTlcIlxyXG4gICAgICB9LFxyXG4gICAgICBcImJhY2tncm91bmRcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJhNjA4OTllZS05OTI1LTRlMDUtODkwZS1iOTQyOGIwMmRiZjlcIlxyXG4gICAgICB9LFxyXG4gICAgICBcIm1pbkhlaWdodFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjFlNDY1NDAzLTUzODItNGE0NS04OWRhLThkODhlMmViMmZiOVwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIjg0ODFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImVmMmVjMTg0LTE5OWYtNGVlOC04ZTMwLWI5OWRiYzFkZjVkYlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwibWFyZ2luXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiZmFiMjg2YzQtZGVkMy00YTVlLTg3NDktNzY3OGFiY2JiMTI1XCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiOTQ4MWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJwYWRkaW5nXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiNzAzZjhlMDItYzVjMy00ZDI3LThjYTItNzIyYzRkMGQxZWEwXCJcclxuICAgICAgfSxcclxuICAgICAgXCJiYWNrZ3JvdW5kXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiOGYzYzY2MzAtZDhkOS00YmMxLThhM2QtYmE0ZGFkMzA5MWYwXCJcclxuICAgICAgfSxcclxuICAgICAgXCJkaXNwbGF5XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiZDMxYzQ3NDYtMjMyOS00NDA0LTg2ODktZmJmMjM5M2VmZDQ0XCJcclxuICAgICAgfSxcclxuICAgICAgXCJib3JkZXJSYWRpdXNcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJkNTc1NGZkYi00Njg5LTRmODctODdmYy01MWQ2MDAyMmIzMmNcIlxyXG4gICAgICB9LFxyXG4gICAgICBcImN1cnNvclwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjBiYzZhMThjLTE3NjYtNDJiZC04YjRhLTIwMmEyYjBjMzRmZVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwidXNlclNlbGVjdFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjliMjUwZWY4LWMxYmUtNDcwNi04YTcxLWY0NDRmMThmMGY4MlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwibWFyZ2luXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiYjBhMTA0OTctZWMyNi00ZmY3LTg3MzktYTE5Mzc1NWNiY2FlXCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiNzQ4MWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJwYWRkaW5nXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiODc2NGUyNTgtNTk5ZC00MjUyLTgxMTItZDA2ZmNkMGQ1ZTJhXCJcclxuICAgICAgfSxcclxuICAgICAgXCJiYWNrZ3JvdW5kXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiOGNhYWY4NzYtMTBiYy00N2RlLTg5ZDktODY5Yzg5MmNkNGNlXCJcclxuICAgICAgfSxcclxuICAgICAgXCJkaXNwbGF5XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiYWU5ODdiYmEtNzM0YS00NmFlLThjODItYzA0ODk2MjIxMTc5XCJcclxuICAgICAgfSxcclxuICAgICAgXCJib3JkZXJSYWRpdXNcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJiN2M3OTFhNi0yYzkxLTRiNjItODgyMC1kYmFhZjlkNWMxNzlcIlxyXG4gICAgICB9LFxyXG4gICAgICBcImN1cnNvclwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImQ3OTVhNTEwLWNjZjktNGQ5Mi04MWVlLTVlNTEyYjgxZWU1OFwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwibWFyZ2luXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiNzUxODUyNGEtMGJjMi00NjVjLTgxNGUtMGE1ZDM5ZGUyNWUzXCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiODA5MmFjNWUtZGZkMC00NDkyLWE2NWQtOGFjM2VlYzMyNWUwXCI6IHtcclxuICAgICAgXCJwYWRkaW5nXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiNjdmNzBkOTctYTM0Ni00MmU0LTgzM2YtNmVhZWFlZWQ0ZmVmXCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiYTk0NjFlMjgtN2Q5Mi00OWEwLTkwMDEtMjNkNzRlNGIzODJkXCI6IHtcclxuICAgICAgXCJwYWRkaW5nXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiOTgyNTc0NjEtOTI4ZS00ZmY5LThhYzUtMGI4OTI5OGU0ZWYxXCJcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIFwiNzY2YjExZWMtZGEyNy00OTRjLWIyNzItYzI2ZmVjM2Y2NDc1XCI6IHtcclxuICAgICAgXCJwYWRkaW5nXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiOTkzMWZlNmEtMDc0ZS00Y2I3LTgzNTUtYzE4ZDgxODY3OWE3XCJcclxuICAgICAgfSxcclxuICAgICAgXCJmbG9hdFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjcyYjU1OWU5LTI1NDYtNGJhZS04YTYxLTU1NTU2NzM2M2IxMVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwidGV4dEFsaWduXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInBpcGVcIixcclxuICAgICAgICBcImlkXCI6IFwiNjYzNWRiYjItYjM2NC00ZWZkLTgwNjEtMjY0MzIwMDdlYjFhXCJcclxuICAgICAgfSxcclxuICAgICAgXCJtYXhXaWR0aFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjA0MmNjZjdkLTgxOWItNGZhYy04MjgyLTJmMTkwNjliNTM4NlwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcImNiY2Q4ZWRiLTRhYTItNDNmZS1hZDM5LWNlZTc5YjQ5MDI5NVwiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImVmOGRjOWM2LWYzMzMtNGI2MS04ZDI1LWQzNmFmZTUxNzUyMFwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiZGlzcGxheVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjc1NWE3MGEyLWQxODEtNGZhZi04NTkzLTVhYjc2MDExNThmOVwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIjY3NjNmMTAyLTIzZjctNDM5MC1iNDYzLTRlMWIxNGU4NjZjOVwiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjlmNTAxYzM1LTU0YjMtNGM2MC04ZmM0LWQ2YTQ1ZTc3NmViM1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiZGlzcGxheVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImU4YWNjNmIwLWQxZGUtNDQzYi04MTI4LWRmNmI1MTg2ZjcwY1wiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIjkxYzlhZGYwLWQ2MmUtNDU4MC05M2U3LWYzOTU5NGFlNWU3ZFwiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjcxNzY0MzYyLWUwOWEtNDQxMi04ZmJjLWVkM2NiNGQ0Yzk1NFwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiZGlzcGxheVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImMxOTliMTkxLTg4ZDItNDYzZC04NTY0LTFjZTFhMTYzMWIyZFwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcImU5ZmJlYjM5LTcxOTMtNDUyMi05MWIzLTc2MWJkMzU2MzlkM1wiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImIyMTE3ZTZiLWFjZTctNGU3NS04ZTdkLTMyMzY2OGQxYjE5ZFwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiZGlzcGxheVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjhhNTM4NDhkLThjN2QtNDRkYy04ZDEzLWFlMDYwMTA3YzgwYlwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIjNjZjVkODlkLTM3MDMtNDgzZS1hYjY0LTVhNWI3ODBhZWMyN1wiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjE5MDZiNWI0LTYwMjQtNDhmMS04NGRhLWMzMzJlNTU1YWZiM1wiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiZGlzcGxheVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImE1NjU2OTZkLThhNjAtNDE2ZS04NDRhLTYwYzhmMmZlOGM1YVwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcImZxOWRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjE1ZDQ3YjA3LTM5NmMtNGMwMy04NTkxLWY0NzI1OThmMTVlMlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwid2lkdGhcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCIzcWtpZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcImhlaWdodFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcInQ3dnFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiYmFja2dyb3VuZFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjhjcTZiNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIjRkY2E3M2IzLTkwZWItNDFlNy04NjUxLTJiZGNjOTNmMzg3MVwiOiB7XHJcbiAgICAgIFwicGFkZGluZ1wiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImE4ZjVjMWNlLTc4M2ItNDYyNi04MjZhLTQ3M2FiNDM0YzBiMlwiXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBcIndmOGQ3M2IzLTkwZWItNDFlNy04NjUxLTJiZGNjOTNmMzg3MVwiOiB7XHJcbiAgICAgIFwiZGlzcGxheVwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcImQxMzE0Mjc0LTVlZmMtNGJlMS04MzBiLTBmZjhjOTJiNTAyOVwiXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIFwibmFtZVNwYWNlXCI6IHtcclxuICAgIFwiX3Jvb3ROYW1lU3BhY2VcIjoge1xyXG4gICAgICBcInRpdGxlXCI6IFwic3RhdGVcIixcclxuICAgICAgXCJjaGlsZHJlblwiOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJzdGF0ZVwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcIjQ2dmRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcInN0YXRlXCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwiYzhxOWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH1cclxuICB9LFxyXG4gIFwic3RhdGVcIjoge1xyXG4gICAgXCI0NnZkZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInRpdGxlXCI6IFwibnVtYmVyXCIsXHJcbiAgICAgIFwicmVmXCI6IFwiNDZ2ZGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCIsXHJcbiAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiLFxyXG4gICAgICBcImRlZmF1bHRWYWx1ZVwiOiAwLFxyXG4gICAgICBcIm11dGF0b3JzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcIm11dGF0b3JcIixcclxuICAgICAgICAgIFwiaWRcIjogXCJhczU1ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgXCJyZWZcIjogXCJtdXRhdG9yXCIsXHJcbiAgICAgICAgICBcImlkXCI6IFwiOWRxOGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgICB9XHJcbiAgICAgIF1cclxuICAgIH0sXHJcbiAgICBcImM4cTlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidGl0bGVcIjogXCJ0aWxlc1wiLFxyXG4gICAgICBcInJlZlwiOiBcImM4cTlkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiLFxyXG4gICAgICBcInR5cGVcIjogXCJ0YWJsZVwiLFxyXG4gICAgICBcImRlZmluaXRpb25cIjoge1xyXG4gICAgICAgIFwieFwiOiBcIm51bWJlclwiLFxyXG4gICAgICAgIFwieVwiOiBcIm51bWJlclwiLFxyXG4gICAgICAgIFwiY29sb3JcIjogXCJ0ZXh0XCJcclxuICAgICAgfSxcclxuICAgICAgXCJkZWZhdWx0VmFsdWVcIjoge1xyXG4gICAgICAgIFwib3BzNmQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgICAgIFwieFwiOiAxMjAsXHJcbiAgICAgICAgICBcInlcIjogMTAwLFxyXG4gICAgICAgICAgXCJjb2xvclwiOiBcIiNlYWI2NWNcIlxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJ3cHY1ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICAgICAgXCJ4XCI6IDIwMCxcclxuICAgICAgICAgIFwieVwiOiAxMjAsXHJcbiAgICAgICAgICBcImNvbG9yXCI6IFwiIzUzQjJFRFwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICBcInFuMjdkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgICAgICBcInhcIjogMTMwLFxyXG4gICAgICAgICAgXCJ5XCI6IDIwMCxcclxuICAgICAgICAgIFwiY29sb3JcIjogXCIjNWJjYzViXCJcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiY2E5cmQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgICAgIFwieFwiOiAxNTAsXHJcbiAgICAgICAgICBcInlcIjogMTUwLFxyXG4gICAgICAgICAgXCJjb2xvclwiOiBcIiM0ZDRkNGRcIlxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgXCJtdXRhdG9yc1wiOiBbXVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXCJtdXRhdG9yXCI6IHtcclxuICAgIFwiYXM1NWQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCI6IHtcclxuICAgICAgXCJldmVudFwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJldmVudFwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJkNDhyZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9LFxyXG4gICAgICBcInN0YXRlXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInN0YXRlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjQ2dmRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwibXV0YXRpb25cIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwicGlwZVwiLFxyXG4gICAgICAgIFwiaWRcIjogXCJwZHE2ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgXCI5ZHE4ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcImV2ZW50XCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcImV2ZW50XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjNhNTRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwic3RhdGVcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwic3RhdGVcIixcclxuICAgICAgICBcImlkXCI6IFwiNDZ2ZGQ2ZDItMDBkYi04YWI1LWMzMzItODgyNTc1ZjI1NDI2XCJcclxuICAgICAgfSxcclxuICAgICAgXCJtdXRhdGlvblwiOiB7XHJcbiAgICAgICAgXCJyZWZcIjogXCJwaXBlXCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjQ1MnFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG4gIFwiZXZlbnRcIjoge1xyXG4gICAgXCJkNDhyZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIjoge1xyXG4gICAgICBcInR5cGVcIjogXCJjbGlja1wiLFxyXG4gICAgICBcIm11dGF0b3JzXCI6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBcInJlZlwiOiBcIm11dGF0b3JcIixcclxuICAgICAgICAgIFwiaWRcIjogXCJhczU1ZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjZcIlxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgXCJlbWl0dGVyXCI6IHtcclxuICAgICAgICBcInJlZlwiOiBcInZOb2RlVGV4dFwiLFxyXG4gICAgICAgIFwiaWRcIjogXCIxNDgxZDZkMi0wMGRiLThhYjUtYzMzMi04ODI1NzVmMjU0MjVcIlxyXG4gICAgICB9LFxyXG4gICAgICBcImRhdGFcIjogW11cclxuICAgIH0sXHJcbiAgICBcIjNhNTRkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiOiB7XHJcbiAgICAgIFwidHlwZVwiOiBcImNsaWNrXCIsXHJcbiAgICAgIFwibXV0YXRvcnNcIjogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIFwicmVmXCI6IFwibXV0YXRvclwiLFxyXG4gICAgICAgICAgXCJpZFwiOiBcIjlkcThkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNlwiXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcImVtaXR0ZXJcIjoge1xyXG4gICAgICAgIFwicmVmXCI6IFwidk5vZGVUZXh0XCIsXHJcbiAgICAgICAgXCJpZFwiOiBcIjM0ODFkNmQyLTAwZGItOGFiNS1jMzMyLTg4MjU3NWYyNTQyNVwiXHJcbiAgICAgIH0sXHJcbiAgICAgIFwiZGF0YVwiOiBbXVxyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==
