const axios = require('axios');

const JUDGE_URL = process.env.SQL_JUDGE_URL || 'http://localhost:8000';
const JUDGE_SECRET = process.env.SQL_JUDGE_SECRET || 'changeme';

// ─── Core: call external SQL Judge API ──────────────────────────────────
async function judgeSqlSubmission({ dbType, setupSql, userSql, expectedSql }) {
    try {
        const response = await axios.post(
            `${JUDGE_URL}/judge`,
            {
                db_type: dbType,
                setup_sql: setupSql,
                user_sql: userSql,
                expected_sql: expectedSql,
            },
            {
                headers: {
                    'x-api-secret': JUDGE_SECRET,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );
        return response.data;
    } catch (error) {
        console.error('SQL Judge Error:', error.message);
        return {
            verdict: 'RE',
            error: error.response?.data?.detail || error.response?.data?.error || error.message
        };
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Convert a pipe-delimited table string to JSON array of objects.
 *
 *   name | salary
 *   Alice | 5000
 *   Bob | 6000
 *
 * Returns: [ { name: "Alice", salary: "5000" }, ... ]
 */
function tableStringToJson(tableStr) {
    const lines = tableStr.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 1) return [];

    const headers = lines[0].split('|').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim());
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = cells[idx] !== undefined ? cells[idx] : '';
        });
        rows.push(row);
    }
    return rows;
}

/**
 * Convert a result set to a pipe-delimited table string.
 * Handles both array-of-objects AND array-of-arrays.
 */
function jsonToTableString(jsonArr, columnHeaders) {
    if (!Array.isArray(jsonArr) || jsonArr.length === 0) return '(empty result set)';

    const firstRow = jsonArr[0];
    const isArrayRows = Array.isArray(firstRow);

    let headers;
    let dataRows;

    if (isArrayRows) {
        const numCols = firstRow.length;
        headers = columnHeaders && columnHeaders.length === numCols
            ? columnHeaders
            : Array.from({ length: numCols }, (_, i) => `col_${i + 1}`);
        dataRows = jsonArr.map(row =>
            row.map(val => val === null ? 'NULL' : String(val)).join(' | ')
        );
    } else {
        headers = Object.keys(firstRow);
        dataRows = jsonArr.map(row =>
            headers.map(h => {
                const val = row[h];
                return val === null ? 'NULL' : String(val);
            }).join(' | ')
        );
    }

    const headerRow = headers.join(' | ');
    return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert array-of-arrays into array-of-objects using column headers.
 */
function normalizeToObjects(rows, columnHeaders) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;
    const firstRow = rows[0];
    if (!Array.isArray(firstRow)) return rows; // already objects

    return rows.map(row => {
        const obj = {};
        row.forEach((val, i) => {
            const key = columnHeaders && columnHeaders[i] ? columnHeaders[i] : `col_${i + 1}`;
            obj[key] = val;
        });
        return obj;
    });
}

/**
 * Normalize a value for comparison
 */
function normalizeValue(v) {
    if (v === null || v === undefined) return 'null';
    return String(v).trim().toLowerCase();
}

/**
 * Extract column headers from a pipe-delimited table string.
 */
function parsePipeHeaders(str) {
    if (!str) return null;
    const lines = str.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 1) return null;
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h.length > 0);
    return headers.length > 0 ? headers : null;
}

/**
 * Deep-compare two result sets for semantic equality.
 * Now strictly checks header names (case-insensitive) and row data.
 * Optionally checks row order if orderSensitive is true.
 */
function compareResultSets(actual, expected, actualHeaders = [], expectedHeaders = [], orderSensitive = false) {
    // 1. Basic checks
    if (actual.length !== expected.length) return false;
    if (actualHeaders.length !== expectedHeaders.length) return false;

    // 2. Strict header check (names must match, order must match)
    for (let i = 0; i < actualHeaders.length; i++) {
        const aHeader = (actualHeaders[i] || '').toLowerCase();
        const eHeader = (expectedHeaders[i] || '').toLowerCase();
        if (aHeader !== eHeader) return false;
    }

    if (actual.length === 0) return true; // Both empty, headers match

    // 3. Row data comparison
    const normActual = normalizeToObjects(actual, actualHeaders);
    const normExpected = normalizeToObjects(expected, expectedHeaders);

    const sortKey = (row, headers) => headers.map(h => normalizeValue(row[h])).join('|');

    if (orderSensitive) {
        // Strict row-by-row comparison (matches EXACTLY as returned by engine)
        for (let i = 0; i < normActual.length; i++) {
            for (let j = 0; j < actualHeaders.length; j++) {
                const hA = actualHeaders[j];
                const hE = expectedHeaders[j];
                if (normalizeValue(normActual[i][hA]) !== normalizeValue(normExpected[i][hE])) {
                    return false;
                }
            }
        }
        return true;
    } else {
        // Order-insensitive comparison (matches by content only)
        const sortedActual = [...normActual].sort((a, b) =>
            sortKey(a, actualHeaders).localeCompare(sortKey(b, actualHeaders))
        );
        const sortedExpected = [...normExpected].sort((a, b) =>
            sortKey(a, expectedHeaders).localeCompare(sortKey(b, expectedHeaders))
        );

        for (let i = 0; i < sortedActual.length; i++) {
            for (let j = 0; j < actualHeaders.length; j++) {
                const hA = actualHeaders[j];
                const hE = expectedHeaders[j];
                if (normalizeValue(sortedActual[i][hA]) !== normalizeValue(sortedExpected[i][hE])) {
                    return false;
                }
            }
        }
        return true;
    }
}

/**
 * Parse expected output — either pipe-delimited table string or JSON array.
 */
function parseExpectedOutput(outputStr) {
    const trimmed = outputStr.trim();
    if (trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed);
        } catch (_) { /* fall through */ }
    }
    return tableStringToJson(trimmed);
}


// ─── Main: execute SQL with test cases (LeetCode-style) ────────────────

/**
 * Execute a user's SQL against multiple test cases.
 * Each test case provides setup SQL (CREATE/INSERT) and expected output.
 *
 * Test cases are run SEQUENTIALLY to prevent table collisions on the shared MySQL DB.
 *
 * @param {string} dbType - "mysql" or "postgres"
 * @param {string} userSql - The student's SQL query
 * @param {Array} testCases - Array of { input, output, isHidden }
 * @param {number} timeLimit - Not currently enforced for SQL but passed for generic API compatibility
 * @param {string} problemId - Key for caching/tracking
 * @param {Object} problem - Optional problem metadata for order-sensitivity detection
 * @returns {Object} { verdict, testCasesPassed, totalTestCases, results, error }
 */
async function executeSqlWithTestCases(dbType, userSql, testCases, timeLimit = 2000, problemId = null, problem = null) {
    let testCasesPassed = 0;
    const evaluatedResults = [];

    // Heuristic: determine if the problem requires specific row ordering
    const desc = (problem?.description || '').toLowerCase();
    const orderSensitive = desc.includes('ordered by') || desc.includes('order by') || desc.includes('sorted by');

    for (let index = 0; index < testCases.length; index++) {
        const tc = testCases[index];
        const setupSql = tc.input || '';
        const expectedOutputRaw = (tc.output || tc.expectedOutput || '').trim();

        try {
            // Call the Python judge API
            const sqlResult = await judgeSqlSubmission({
                dbType,
                setupSql,
                userSql,
                expectedSql: userSql, // We compare on our side; judge just executes
            });

            // ── Runtime error ──
            if (sqlResult.error || sqlResult.verdict === 'RE') {
                evaluatedResults.push({
                    testCaseId: tc.id || tc.id || `custom-${index}`,
                    input: setupSql,
                    expectedOutput: expectedOutputRaw,
                    actualOutput: '',
                    passed: false,
                    verdict: 'Runtime Error',
                    error: sqlResult.error || 'SQL Execution Error',
                    isHidden: tc.isHidden || false,
                    isCustom: tc.isCustom || false
                });
                continue;
            }

            // ── Extract column headers ──
            const actualHeaders = sqlResult.columns || [];  // From cur.description in Python
            const expectedHeaders = parsePipeHeaders(expectedOutputRaw) || [];

            // ── Convert actual result rows ──
            const actualRows = sqlResult.got || [];
            const actualTableStr = jsonToTableString(actualRows, actualHeaders);

            // ── Parse expected output ──
            const expectedRows = parseExpectedOutput(expectedOutputRaw);
            const expectedTableStr = jsonToTableString(expectedRows, expectedHeaders);

            // ── Compare ──
            const passed = compareResultSets(actualRows, expectedRows, actualHeaders, expectedHeaders, orderSensitive);
            if (passed) testCasesPassed++;

            evaluatedResults.push({
                testCaseId: tc.id || tc.id || `custom-${index}`,
                input: setupSql,
                expectedOutput: expectedTableStr,
                actualOutput: actualTableStr,
                passed,
                verdict: passed ? 'Accepted' : 'Wrong Answer',
                error: null,
                isHidden: tc.isHidden || false,
                isCustom: tc.isCustom || false
            });
        } catch (err) {
            evaluatedResults.push({
                testCaseId: tc.id || tc.id || `custom-${index}`,
                input: setupSql,
                expectedOutput: expectedOutputRaw,
                actualOutput: '',
                passed: false,
                verdict: 'Runtime Error',
                error: err.message,
                isHidden: tc.isHidden || false,
                isCustom: tc.isCustom || false
            });
        }
    }

    // ── Final verdict ──
    const isCE = evaluatedResults.some(r => r.verdict === 'Compilation Error');
    const isRE = evaluatedResults.some(r => r.verdict === 'Runtime Error');
    const isTLE = evaluatedResults.some(r => r.verdict === 'TLE');

    const finalVerdict = evaluatedResults.every(r => r.passed) ? 'Accepted'
        : isCE ? 'Compilation Error'
        : isRE ? 'Runtime Error'
        : isTLE ? 'TLE'
        : 'Wrong Answer';

    return {
        verdict: finalVerdict,
        testCasesPassed,
        totalTestCases: testCases.length,
        results: evaluatedResults,
        error: evaluatedResults.find(r => r.error)?.error || null
    };
}

module.exports = { judgeSqlSubmission, executeSqlWithTestCases };
