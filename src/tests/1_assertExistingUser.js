const  assertWebsite = function (website) {
    return website === 'hildegard.org'
}

module.exports = {
    name: 'get todos',
    method: 'GET',
    endpoint: 'https://jsonplaceholder.typicode.com/users/1',
    request: 'getTodos',
    assertions: {
        //Assert literal comparissons
        name: 'Leanne Graham',
        address: {
            //Assert nested fields
            street: `Kulas Light`,
            //Assert via functions
            zipcode: zipCode => zipCode.endsWith('3874')
        },
        //Multiple assertions per field
        company: [
            company => company.name === 'Romaguera-Crona',
            company => company.catchPhrase.endsWith('net'),
        ],
        //Use custom methods to assert
        website: assertWebsite
    },

}