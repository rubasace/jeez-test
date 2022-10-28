module.exports = {
    name: 'shop',
    endpoint: "https://air-shop.prd.travix.com/flights/v2/shop",
    assertions: {
        hasDeduping: false,
        fares: [
            fares => fares.length > 10,
            // fares => fares[0].provider === '1A'
        ]
    }
}