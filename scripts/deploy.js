const hre = require("hardhat");

async function main() {
    const admin = (await hre.ethers.getSigners())[0];
    const AccessManager = await hre.ethers.getContractFactory("DominManager");
    const accessManager = await AccessManager.deploy(admin);
    await accessManager.waitForDeployment();
    const accessManagerAddress = await accessManager.getAddress();
    console.log(`AccessManager deployed to: ${accessManagerAddress}`);
    const Vault = await hre.ethers.getContractFactory("DominVault");
    const vault = await Vault.deploy(accessManagerAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`Vault deployed to: ${vaultAddress}`);
    const AuthorizerNFT = await hre.ethers.getContractFactory("AuthorizerNFT");
    const authorizerNFT = await AuthorizerNFT.deploy(
        'AuthorizerNFT',
        'ANFT',
        admin,
        500,
        accessManagerAddress,
        vaultAddress,
    );
    await authorizerNFT.waitForDeployment();
    const authorizerNFTAddress = await authorizerNFT.getAddress();
    console.log(`AuthorizerNFT deployed to: ${authorizerNFTAddress}`);
    const operatorNFTAddress = await authorizerNFT.getOperatorNFTAddress();
    console.log(`OperatorNFT deployed to: ${operatorNFTAddress}`);
    const operatorNFT = await hre.ethers.getContractAt('OperatorNFT', operatorNFTAddress);
    const MINTER = 1n;
    const AUDITOR = 2n;
    const AUTHORIZER = 3n;
    const chainId = await hre.ethers.provider.getNetwork().then(network => network.chainId);
    await Promise.all([
        authorizerNFT.setBaseURI(`https://api-hrhr7sk67q-uc.a.run.app/api/v1/metadata/${chainId}/${authorizerNFTAddress}/`),
        operatorNFT.setBaseURI(`https://api-hrhr7sk67q-uc.a.run.app/api/v1/metadata/${chainId}/${operatorNFTAddress}/`)
    ]);
    await Promise.all([
        accessManager.grantRole(MINTER, admin.address, 0),
        accessManager.grantRole(AUDITOR, authorizerNFTAddress, 0),
        accessManager.grantRole(AUTHORIZER, authorizerNFTAddress, 0),
        accessManager.labelRole(MINTER, 'MINTER'),
        accessManager.labelRole(AUDITOR, 'AUDITOR'),
        accessManager.labelRole(AUTHORIZER, 'AUTHORIZER'),
    ]);
    await Promise.all([
        accessManager.setTargetFunctionRole(
            authorizerNFTAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('safeMint(address)')).slice(0, 10),
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('safeMintOperatorNFT(uint256,address)')).slice(0, 10),
            ],
            MINTER,
        ),
        accessManager.setTargetFunctionRole(
            operatorNFTAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('safeMint(uint256,address)')).slice(0, 10),
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('operatorRedeem(uint256,(address,uint256,bytes32,string))')).slice(0, 10),
            ],
            AUTHORIZER,
        ),
        accessManager.setTargetFunctionRole(
            operatorNFTAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('verifyOperator(address,bool)')).slice(0, 10),
            ],
            AUDITOR,
        ),
        accessManager.setTargetFunctionRole(
            vaultAddress,
            [
                hre.ethers.keccak256(hre.ethers.toUtf8Bytes('payFees(address,uint256,address,uint256,uint256)')).slice(0, 10),
            ],
            AUTHORIZER,
        )
    ]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
