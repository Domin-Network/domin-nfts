const hre = require('hardhat');

async function main() {
    const admin = (await hre.ethers.getSigners())[0];
    const gasPrice = (await hre.ethers.provider.getFeeData()).maxFeePerGas;
    let accessManagerAddress = hre.network.config.accessManagerAddress;
    let accessManager;
    if (!accessManagerAddress) {
        console.log('Deploying AccessManager...');
        const AccessManager = await hre.ethers.getContractFactory('DominManager');
        accessManager = await AccessManager.deploy(admin);
        await accessManager.waitForDeployment();
        accessManagerAddress = await accessManager.getAddress();
    } else {
        accessManager = await hre.ethers.getContractAt('DominManager', accessManagerAddress);
    }
    console.log(`AccessManager deployed to: ${accessManagerAddress}`);
    let vaultAddress = hre.network.config.vaultAddress;
    if (!vaultAddress) {
        console.log('Deploying Vault...');
        const Vault = await hre.ethers.getContractFactory('DominVault');
        const vault = await Vault.deploy(accessManagerAddress);
        await vault.waitForDeployment();
        vaultAddress = await vault.getAddress();
    }
    console.log(`Vault deployed to: ${vaultAddress}`);
    let authorizerNFTAddress = hre.network.config.authorizerNFTAddress;
    let operatorNFTAddress = hre.network.config.operatorNFTAddress;
    let authorizerNFT;
    if (!authorizerNFTAddress) {
        console.log('Deploying AuthorizerNFT...');
        const AuthorizerNFT = await hre.ethers.getContractFactory('AuthorizerNFT');
        authorizerNFT = await AuthorizerNFT.deploy(
            'AuthorizerNFT',
            'ANFT',
            admin,
            500,
            accessManagerAddress,
            vaultAddress,
        );
        await authorizerNFT.waitForDeployment();
        authorizerNFTAddress = await authorizerNFT.getAddress();
        operatorNFTAddress = await authorizerNFT.getOperatorNFTAddress();
    } else {
        authorizerNFT = await hre.ethers.getContractAt('AuthorizerNFT', authorizerNFTAddress);
    }
    console.log(`AuthorizerNFT deployed to: ${authorizerNFTAddress}`);
    console.log(`OperatorNFT deployed to: ${operatorNFTAddress}`);
    const operatorNFT = await hre.ethers.getContractAt('OperatorNFT', operatorNFTAddress);
    const MINTER = 1n;
    const AUDITOR = 2n;
    const AUTHORIZER = 3n;
    if (
        !(await accessManager.hasRole(MINTER, admin.address))[0] ||
        !(await accessManager.hasRole(AUDITOR, authorizerNFTAddress))[0] ||
        !(await accessManager.hasRole(AUTHORIZER, authorizerNFTAddress))[0]
    ) {
        console.log('Granting roles...');
        await accessManager.grantRole(MINTER, admin.address, 0, { gasPrice });
        await accessManager.grantRole(AUDITOR, authorizerNFTAddress, 0, { gasPrice });
        await accessManager.grantRole(AUTHORIZER, authorizerNFTAddress, 0, { gasPrice });
        await accessManager.labelRole(MINTER, 'MINTER');
        await accessManager.labelRole(AUDITOR, 'AUDITOR');
        await accessManager.labelRole(AUTHORIZER, 'AUTHORIZER');
    }
    if (
        (
            await accessManager.getTargetFunctionRole(
                authorizerNFTAddress,
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('safeMint(address)')).slice(0, 10),
            )
        ) !== MINTER
    ) {
        console.log('Setting target function roles for MINTER');
        await accessManager.setTargetFunctionRole(
            authorizerNFTAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('safeMint(address)')).slice(0, 10),
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('safeMintOperatorNFT(uint256,address)')).slice(0, 10),
            ],
            MINTER,
            { gasPrice },
        );
    }
    if (
        (
            await accessManager.getTargetFunctionRole(
                operatorNFTAddress,
                ethers.keccak256(ethers.toUtf8Bytes('safeMint(uint256,address)')).slice(0, 10),
            ) !== AUTHORIZER
        )
    ) {
        console.log('Setting target function roles for AUTHORIZER');
        accessManager.setTargetFunctionRole(
            operatorNFTAddress,
            [
                ethers.keccak256(ethers.toUtf8Bytes('safeMint(uint256,address)')).slice(0, 10),
                ethers.keccak256(ethers.toUtf8Bytes('operatorRedeem(uint256,(address,uint256,bytes32,string))')).slice(0, 10),
            ],
            AUTHORIZER,
        );
    }
    if (
        (
            await accessManager.getTargetFunctionRole(
                operatorNFTAddress,
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('verifyOperator(address,bool)')).slice(0, 10),
            )
        ) !== AUDITOR
    ) {
        console.log('Setting target function roles for AUDITOR');
        await accessManager.setTargetFunctionRole(
            operatorNFTAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('verifyOperator(address,bool)')).slice(0, 10),
            ],
            AUDITOR,
            { gasPrice },
        );
    }
    if (
        (
            await accessManager.getTargetFunctionRole(
                vaultAddress,
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('payFees(address,uint256,address,uint256,uint256)')).slice(0, 10),
            )
        ) !== AUTHORIZER
    ) {
        console.log('Setting target function roles for AUTHORIZER');
        await accessManager.setTargetFunctionRole(
            vaultAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('payFees(address,uint256,address,uint256,uint256)')).slice(0, 10),
            ],
            AUTHORIZER,
            { gasPrice },
        );
    }
    if ((await authorizerNFT.tokenURI(1)).length === 0) {
        console.log('Set base URI for NFTs');
        const chainId = (await hre.ethers.provider.getNetwork()).chainId;
        await authorizerNFT.setBaseURI(`https://api-hrhr7sk67q-uc.a.run.app/api/v1/metadata/${chainId}/${authorizerNFTAddress}/`);
        await operatorNFT.setBaseURI(`https://api-hrhr7sk67q-uc.a.run.app/api/v1/metadata/${chainId}/${operatorNFTAddress}/`);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
