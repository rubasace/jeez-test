const fs = require('fs');
const axios = require('axios');
const {LocalDate, LocalDateTime, LocalTime} = require('@js-joda/core');

const availableVariables = {
    LocalDate,
    LocalTime,
    LocalDateTime
}

const processRequest = function (request, context, requestFunctionParams) {
    for (const key in request) {
        let value = request[key];
        if (value) {
            if (typeof value === 'object') {
                processRequest(value, context, requestFunctionParams)
            } else {
                if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
                    const expression = value.substring(1, value.length - 1)
                    const expressionFunction = new Function(requestFunctionParams, `return ${expression}`);
                    request[key] = expressionFunction({...availableVariables, context});
                }
            }
        }
    }
    return request;
}

const applyAssertion = function (assertion, value, field) {
    const assertFunc = typeof assertion === 'function' ? assertion : `${field} === ${assertion}`
    const result = typeof assertion === 'function' ? assertion(value) : assertion === value;
    if (result) {
        console.log(`Assertion ${assertFunc} succeded.`)
    } else {
        const extraDetails = typeof value !== 'object' ? ` Actual value was ${value} (${typeof value})` : ''
        console.log(`Assertion ${assertFunc} failed.` + extraDetails)
    }
    return result;
}

const processResponse = function (assertions, response) {
    let success = true;
    for (const key in assertions) {
        let assertion = assertions[key];
        const value = response[key];
        if (Array.isArray(assertion)) {
            const result = assertion.map(e => applyAssertion(e, value, key))
                .reduce((a, b) => a && b, true);
            if (!result) {
                success = false
            }
        } else if (typeof assertion === 'object') {
            if (typeof value !== 'object') {
                throw `Field ${key} is not an object`
            }
            success = processResponse(assertion, value)
        } else {
            const result = applyAssertion(assertion, value, key);
            if (!result) {
                success = false;
            }
        }
    }
    return success;
}

function getRequest(test, name, context) {
    const request = test['request'];
    if (typeof request === 'function') {
        return test.request(context);
    }
    const filename = typeof request === 'string' ? request : name;
    const file = fs.readFileSync(`./tests/${filename}.json`);
    return JSON.parse(file)
}

function applyTest(test, filename, context) {
    if (test['endpoint'] === undefined) {
        throw `endpoint must be provided but is missing for ${filename}`
    }
    const endpoint = test.endpoint;
    if (test['assertions'] === undefined) {
        throw `assertions must be provided but are missing for ${filename}`
    }
    const assertions = test.assertions;
    const method = test.method ? test.method : 'POST';
    const expectedStatus = test.expectedStatus ? test.expectedStatus : 200;
    const name = test.name ?? filename;
    const paramsObject = {...availableVariables, context};
    const requestFunctionParams = '{' + Object.keys(paramsObject).join(',') + '}';
    const request = processRequest(getRequest(test, name, context), context, requestFunctionParams)

    return axios({
        method: method,
        url: endpoint,
        data: request

    }).then((response) => {
        const testContext = {}
        testContext.status = response.status
        testContext.responseBody = response.data
        testContext.responseHeaders = response.headers
        context[name] = testContext;
        if (expectedStatus !== response.status) {
            throw `Expected status ${expectedStatus} but received ${response.status}`
        }
        const responseBody = response.data;
        // console.log(responseBody)
        if (!processResponse(assertions, responseBody)) {
            Promise.reject('Failed assertions!!')
        }
    });
}

const context = {}

fs.readdir("./tests", (error, files) => {
    return files.filter(e => e.endsWith('.js')).reduce((p, filename) => {
        return p.then(() => {
            return applyTest(require('./tests/' + filename), filename, context);
        });
    }, Promise.resolve());
});