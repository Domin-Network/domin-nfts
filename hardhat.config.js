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
            url: 'https://rpc-mumbai.maticvigil.com',
            accounts: [process.env.ACCOUNTS_0_PRIVATE_KEY],
            accessManagerAddress: process.env.MUMBAI_ACCESS_MANAGER_ADDRESS,
            vaultAddress: process.env.MUMBAI_VAULT_ADDRESS,
            authorizerNFTAddress: process.env.MUMBAI_AUTHORIZER_NFT_ADDRESS,
            operatorNFTAddress: process.env.MUMBAI_OPERATOR_NFT_ADDRESS,
        },
    },
};
