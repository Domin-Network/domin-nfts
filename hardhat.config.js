require('@nomicfoundation/hardhat-toolbox');
require('./tasks/mint');
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    solidity: {
        version: '0.8.20',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {},
        mumbai: {
            url: 'https://polygon-mumbai.g.alchemy.com/v2/doaxH5T2SMiRDTmkjuL4Hny0Luc94pNP',
            accounts: [process.env.ACCOUNTS_0_PRIVATE_KEY],
            accessManagerAddress: '0x4C88B8aB4679eC24feb8923A7104Dc0293EB4d72',
            vaultAddress: '0x6Ee164207EFF042F89C2d574344c73Eb20d09Aa5',
            authorizerNFTAddress: 'np',
            operatorNFTAddress: '0x4FD3B5Fb983466f2E1ecfE16a22CCA93C2fab959',
        },
    },
};
