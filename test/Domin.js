const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Domin', function () {
    let dominAdmin;
    let manager;
    let vault;
    let authorizerNFT;
    let authorizerNFTHolder;
    let operatorNFT;
    let operatorNFTHolder;
    let nft;
    let nftHolder;
    let redeemWithBurnOperator;
    let feeToken;

    this.beforeAll(async function () {
        accounts = await ethers.getSigners();
        dominAdmin = accounts[0];
        authorizerNFTHolder = accounts[1];
        operatorNFTHolder = accounts[2];
        nftHolder = accounts[3];
        console.log(`
Domin Admin: ${dominAdmin.address}
Authorizer NFT Holder: ${authorizerNFTHolder.address}
Operator NFT Holder: ${operatorNFTHolder.address}
NFT Holder: ${nftHolder.address}
        `);
    });

    this.beforeEach(async function () {
        await Promise.all([deployOperator(), deployManager()]);
        await deployDominVault();
        await Promise.all([deployAuthorizerNFT(), deployTestNFT()]);
        await grantRoles();
        await mintAuthorizerNFT();
        await Promise.all([mintOperatorNFT(), mintTestNFT()]);
        await deployFeeToken();
    });

    async function deployManager() {
        const Manager = await ethers.getContractFactory('DominManager');
        const contract = await Manager.deploy(dominAdmin.address);
        await contract.waitForDeployment();
        manager = contract;
        console.log(`Manager: ${await manager.getAddress()}`);
    }

    async function deployDominVault() {
        const Vault = await ethers.getContractFactory('DominVault');
        const contract = await Vault.deploy(await manager.getAddress());
        await contract.waitForDeployment();
        vault = contract;
        console.log(`Vault: ${await vault.getAddress()}`);
    }

    async function deployAuthorizerNFT() {
        const AuthorizerNFT = await ethers.getContractFactory('AuthorizerNFT');
        const managerAddress = await manager.getAddress();
        const vaultAddress = await vault.getAddress();
        const contract = await AuthorizerNFT.deploy('AuthorizerNFT', 'ANFT', accounts[0].address, 500, managerAddress, vaultAddress);
        await contract.waitForDeployment();
        const operatorNFTAddress = await contract.getOperatorNFTAddress();
        operatorNFT = await ethers.getContractAt('OperatorNFT', operatorNFTAddress);
        authorizerNFT = contract;
        await authorizerNFT.setBaseURI('https://example.com/');
        await operatorNFT.setBaseURI('https://example.com/');
        console.log(`
AuthorizerNFT: ${await authorizerNFT.getAddress()}
OperatorNFT: ${operatorNFTAddress}`
        );
    }

    async function deployTestNFT() {
        const TestNFT = await ethers.getContractFactory('TestNFT');
        const contract = await TestNFT.deploy();
        await contract.waitForDeployment();
        nft = contract;
        console.log(`TestNFT: ${await nft.getAddress()}`);
    }

    async function deployOperator() {
        const Operator = await ethers.getContractFactory('RedeemWithBurnOperator');
        const contract = await Operator.deploy();
        await contract.waitForDeployment();
        redeemWithBurnOperator = contract;
        console.log(`Operator: ${await redeemWithBurnOperator.getAddress()}`);
    }

    async function mintAuthorizerNFT() {
        await authorizerNFT.safeMint(authorizerNFTHolder.address);
    }

    async function mintOperatorNFT() {
        const tokenId = await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0);
        await authorizerNFT.connect(authorizerNFTHolder).safeMintOperatorNFT(tokenId, operatorNFTHolder.address);
    }

    async function mintTestNFT() {
        await nft.safeBatchMint(nftHolder.address, 10);
    }

    async function grantRoles() {
        const MINTER = 1n;
        const AUDITOR = 2n;
        const AUTHORIZER = 3n;
        const authorizerNFTAddress = await authorizerNFT.getAddress();
        const operatorNFTAddress = await operatorNFT.getAddress();
        const vaultAddress = await vault.getAddress();
        await Promise.all([
            manager.grantRole(MINTER, accounts[0].address, 0),
            manager.grantRole(AUDITOR, authorizerNFTAddress, 0),
            manager.grantRole(AUTHORIZER, authorizerNFTAddress, 0),
            manager.labelRole(MINTER, 'MINTER'),
            manager.labelRole(AUDITOR, 'AUDITOR'),
            manager.labelRole(AUTHORIZER, 'AUTHORIZER'),
        ]);
        await Promise.all([
            manager.setTargetFunctionRole(
                authorizerNFTAddress,
                [
                    ethers.keccak256(ethers.toUtf8Bytes('safeMint(address)')).slice(0, 10),
                    ethers.keccak256(ethers.toUtf8Bytes('safeMintOperatorNFT(uint256,address)')).slice(0, 10),
                ],
                MINTER,
            ),
            manager.setTargetFunctionRole(
                operatorNFTAddress,
                [
                    ethers.keccak256(ethers.toUtf8Bytes('safeMint(uint256,address)')).slice(0, 10),
                    ethers.keccak256(ethers.toUtf8Bytes('operatorRedeem(uint256,(address,uint256,bytes32,string))')).slice(0, 10),
                ],
                AUTHORIZER,
            ),
            manager.setTargetFunctionRole(
                operatorNFTAddress,
                [
                    ethers.keccak256(ethers.toUtf8Bytes('verifyOperator(address,bool)')).slice(0, 10),
                ],
                AUDITOR,
            ),
            manager.setTargetFunctionRole(
                vaultAddress,
                [
                    ethers.keccak256(ethers.toUtf8Bytes('payFees(address,uint256,address,uint256,uint256)')).slice(0, 10),
                ],
                AUTHORIZER,
            )
        ]);
    }

    async function deployFeeToken() {
        const DominToken = await ethers.getContractFactory('DominToken');
        const token = await DominToken.deploy();
        await token.waitForDeployment();
        await vault.setFeeToken(await token.getAddress());
        const defaultFeeAmount = await vault.defaultRedeemFee();
        await token.faucet(authorizerNFTHolder.address, defaultFeeAmount);
        await token.connect(authorizerNFTHolder).approve(await vault.getAddress(), defaultFeeAmount);
        await vault.connect(authorizerNFTHolder).depositPrepaidFee(
            await authorizerNFT.getAddress(),
            await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0),
            defaultFeeAmount,
        )
        feeToken = token;
    };

    async function getRedemptions() {
        return [
            {
                token: await nft.getAddress(),
                tokenId: await nft.tokenOfOwnerByIndex(nftHolder.address, 0),
                redemptionId: ethers.encodeBytes32String('test'),
                memo: 'test',
            }
        ];
    }

    it('base URI is set', async () => {
        expect(await authorizerNFT.tokenURI(1)).to.equal('https://example.com/1');
        expect(await operatorNFT.tokenURI(1)).to.equal('https://example.com/1');
    });

    it('has roles', async () => {
        const MINTER = 1n;
        const AUDITOR = 2n;
        const AUTHORIZER = 3n;
        const authorizerNFTAddress = await authorizerNFT.getAddress();
        expect((await manager.hasRole(MINTER, accounts[0].address))[0]).to.be.true;
        expect((await manager.hasRole(AUDITOR, authorizerNFTAddress))[0]).to.be.true;
        expect((await manager.hasRole(AUTHORIZER, authorizerNFTAddress))[0]).to.be.true;
    });

    it('should be able to mint NFTs', async () => {
        expect(await authorizerNFT.balanceOf(authorizerNFTHolder.address)).to.equal(1);
        expect(await operatorNFT.balanceOf(operatorNFTHolder.address)).to.equal(1);
        expect(await nft.balanceOf(nftHolder.address)).to.equal(10);
    });

    it('should not be able to redeem without AuthorizerNFT', async () => {
        const redemptions = await getRedemptions();
        await expect(authorizerNFT.redeemRedemptions(
            await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0),
            await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0),
            redemptions,
        )).to.be.revertedWithCustomError(authorizerNFT, 'AuthorizerNFTForbiddenRedeem').withArgs(accounts[0].address);
    });

    it('should be able to redeem with AuthorizerNFT and operator should be OperatorNFT', async () => {
        const redemptions = await getRedemptions();
        await expect(
            authorizerNFT.connect(accounts[1]).redeemRedemptions(
                await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0),
                await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0),
                redemptions,
            ),
        ).to.emit(nft, 'Redeem').withArgs(
            await operatorNFT.getAddress(),
            redemptions[0].tokenId,
            nftHolder.address,
            redemptions[0].redemptionId,
            redemptions[0].memo,
        );
    });

    it('should not be able to redeem with AuthorizerNFT with mismatched OperatorNFT', async () => {
        const redemptions = await getRedemptions();
        const authorizerNFTTokenId = await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0);
        const operatorNFTTokenId = await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0);
        await authorizerNFT.safeMint(authorizerNFTHolder.address);
        expect(await authorizerNFT.balanceOf(authorizerNFTHolder.address)).to.equal(2);
        await operatorNFT.connect(operatorNFTHolder).register(operatorNFTTokenId, Number(operatorNFTTokenId) + 1);
        await expect(
            authorizerNFT.connect(accounts[1]).redeemRedemptions(
                authorizerNFTTokenId,
                operatorNFTTokenId,
                redemptions,
            ),
        ).to.be.revertedWithCustomError(authorizerNFT, 'AuthorizerNFTForbiddenRedeemOperatorNFT').withArgs(authorizerNFTHolder.address);
    });

    it('should not be able to redeem with AuthorizerNFT and burn', async () => {
        const redemptions = await getRedemptions();
        const operatorNFTTokenId = await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0);
        const operatorAddress = await redeemWithBurnOperator.getAddress();
        await operatorNFT.connect(operatorNFTHolder).set(operatorNFTTokenId, operatorAddress);
        await expect(
            authorizerNFT.connect(accounts[1]).redeemRedemptions(
                await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0),
                operatorNFTTokenId,
                redemptions
            ),
        ).to.be.revertedWithCustomError(nft, 'ERC721InsufficientApproval').withArgs(operatorAddress, redemptions[0].tokenId);
    });

    it('should be able to redeem with AuthorizerNFT and burn', async () => {
        const redemptions = await getRedemptions();
        const operatorNFTTokenId = await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0);
        const operatorAddress = await redeemWithBurnOperator.getAddress();
        await operatorNFT.connect(operatorNFTHolder).set(operatorNFTTokenId, operatorAddress);
        await nft.connect(nftHolder).approve(operatorAddress, redemptions[0].tokenId);
        await expect(
            authorizerNFT.connect(accounts[1]).redeemRedemptions(
                await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0),
                operatorNFTTokenId,
                redemptions,
            ),
        ).to.emit(nft, 'Redeem').withArgs(
            operatorAddress,
            redemptions[0].tokenId,
            nftHolder.address,
            redemptions[0].redemptionId,
            `[WARNING] ${redemptions[0].memo}`,
        );
        expect(await nft.balanceOf(nftHolder.address)).to.equal(9);
    });

    it('should be able to redeem with AuthorizerNFT and burn', async () => {
        const redemptions = await getRedemptions();
        const operatorNFTTokenId = await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0);
        const operatorAddress = await redeemWithBurnOperator.getAddress();
        const authorizerNFTTokenId = await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0);
        await operatorNFT.connect(operatorNFTHolder).set(operatorNFTTokenId, operatorAddress);
        await authorizerNFT.connect(authorizerNFTHolder).verifyOperator(authorizerNFTTokenId, operatorAddress, true);
        await nft.connect(nftHolder).approve(operatorAddress, redemptions[0].tokenId);
        await expect(
            authorizerNFT.connect(accounts[1]).redeemRedemptions(
                authorizerNFTTokenId,
                operatorNFTTokenId,
                redemptions,
            ),
        ).to.emit(nft, 'Redeem').withArgs(
            operatorAddress,
            redemptions[0].tokenId,
            nftHolder.address,
            redemptions[0].redemptionId,
            redemptions[0].memo,
        );
        expect(await nft.balanceOf(nftHolder.address)).to.equal(9);
    });

    it('should be earn fees into vault', async () => {
        const redemptions = await getRedemptions();
        const operatorNFTTokenId = await operatorNFT.tokenOfOwnerByIndex(operatorNFTHolder.address, 0);
        const authorizerNFTTokenId = await authorizerNFT.tokenOfOwnerByIndex(authorizerNFTHolder.address, 0);
        await authorizerNFT.connect(accounts[1]).redeemRedemptions(
            authorizerNFTTokenId,
            operatorNFTTokenId,
            redemptions,
        );
        const { token, amount } = await vault.getFeeBalance(authorizerNFT, authorizerNFTTokenId);
        expect(await feeToken.getAddress()).to.equal(token);
        expect(Number(amount)).to.equal(0);
        const authorizerNFTReward = await vault.getAuthorizerNFTReward(authorizerNFT, authorizerNFTTokenId);
        expect(
            Number(authorizerNFTReward.amount)
        ).to.equal(
            Number(await vault.defaultAuthorizerRewardPercentage()) * Number(await vault.defaultRedeemFee()) / 100);
        console.log(`Redemptions: ${redemptions[0].redemptionId}`)
    });
});
