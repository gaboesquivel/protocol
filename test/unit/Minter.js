import Fixture from "../helpers/fixture"
import expectThrow from "../helpers/expectThrow"

const Minter = artifacts.require("Minter")

const PERC_DIVISOR = 1000000
const PERC_MULTIPLIER = PERC_DIVISOR / 100

const INFLATION = 26 * PERC_MULTIPLIER
const INFLATION_CHANGE = .02 * PERC_MULTIPLIER
const TARGET_BONDING_RATE = 50 * PERC_MULTIPLIER

contract("Minter", accounts => {
    let fixture
    let minter

    before(async () => {
        fixture = new Fixture(web3)
        await fixture.deployController()
        await fixture.deployMocks()
        // fixture.token = await fixture.deployAndRegister(LivepeerToken, "LivepeerToken")

        minter = await fixture.deployAndRegister(Minter, "Minter", fixture.controller.address, INFLATION, INFLATION_CHANGE, TARGET_BONDING_RATE)
        fixture.minter = minter

        // await fixture.token.mint(minter.address, minterBalance)
        // await fixture.token.transferOwnership(minter.address)
        await fixture.bondingManager.setMinter(minter.address)
        await fixture.jobsManager.setMinter(minter.address)
        await fixture.roundsManager.setMinter(minter.address)
    })

    beforeEach(async () => {
        await fixture.setUp()
    })

    afterEach(async () => {
        await fixture.tearDown()
    })

    describe("createRewards", () => {
        it("should throw if sender is not bonding manager", async () => {
            await expectThrow(minter.createReward(10, 100))
        })

        it("should compute rewards when redistributionPool = 0", async () => {
            await fixture.token.setTotalSupply(1000)
            await fixture.bondingManager.setTotalBonded(200)
            // Set up current reward tokens via RoundsManager
            await fixture.roundsManager.callSetCurrentRewardTokens()

            // Set up reward call via BondingManager
            await fixture.bondingManager.setActiveTranscoder(accounts[1], 0, 10, 100)
            await fixture.bondingManager.reward()

            const supply = await fixture.token.totalSupply.call()
            const inflation = await minter.inflation.call()
            const mintedTokens = supply.mul(inflation).div(PERC_DIVISOR).floor()

            const mintedTo = await fixture.token.mintedTo.call()
            assert.equal(mintedTo, minter.address, "wrong minted to address")
            const minted = await fixture.token.minted.call()
            assert.equal(minted, mintedTokens.mul(10).div(100).floor().toNumber(), "wrong minted amount")
        })

        it("should compute rewards and update the redistributionPool when redistributionPool > 0", async () => {
            await fixture.token.setTotalSupply(1000000)
            await fixture.bondingManager.setTotalBonded(200000)
            // Set up current reward tokens via RoundsManager
            await fixture.bondingManager.callAddToRedistributionPool(100000)
            await fixture.roundsManager.callSetCurrentRewardTokens()

            // Set up reward call via BondingManager
            await fixture.bondingManager.setActiveTranscoder(accounts[1], 0, 10, 100)
            await fixture.bondingManager.reward()

            const supply = await fixture.token.totalSupply.call()
            const inflation = await minter.inflation.call()
            const mintedTokens = supply.mul(inflation).div(PERC_DIVISOR).floor()

            const mintedTo = await fixture.token.mintedTo.call()
            assert.equal(mintedTo, minter.address, "wrong minted to address")
            const minted = await fixture.token.minted.call()
            assert.equal(minted, mintedTokens.mul(10).div(100).floor().toNumber(), "wrong minted amount")

            const redistributedTokens = (100000 * 10) / 100
            const expRedistributionPool = 100000 - redistributedTokens

            const redistributionPool = await minter.redistributionPool.call()
            assert.equal(redistributionPool, expRedistributionPool, "redistribution pool incorrect")
        })

        it("should compute rewards correctly for multiple valid calls", async () => {
            await fixture.token.setTotalSupply(1000000)
            await fixture.bondingManager.setTotalBonded(200000)
            // Set up current reward tokens via RoundsManager
            await fixture.roundsManager.callSetCurrentRewardTokens()

            const supply = await fixture.token.totalSupply.call()
            const inflation = await minter.inflation.call()
            const mintedTokens = supply.mul(inflation).div(PERC_DIVISOR).floor()

            // Set up reward call via BondingManager
            await fixture.bondingManager.setActiveTranscoder(accounts[1], 0, 10, 100)
            await fixture.bondingManager.reward()

            let mintedTo = await fixture.token.mintedTo.call()
            assert.equal(mintedTo, minter.address, "wrong minted to address")
            let minted = await fixture.token.minted.call()
            assert.equal(minted, mintedTokens.mul(10).div(100).floor().toNumber(), "wrong minted amount")

            // Set up reward call via BondingManager
            await fixture.bondingManager.setActiveTranscoder(accounts[1], 0, 20, 100)
            await fixture.bondingManager.reward()

            mintedTo = await fixture.token.mintedTo.call()
            assert.equal(mintedTo, minter.address, "wrong minted to address")
            minted = await fixture.token.minted.call()
            assert.equal(minted, mintedTokens.mul(20).div(100).floor().toNumber(), "wrong minted amount")
        })

        it("should throw if all mintable tokens have been minted", async () => {
            await fixture.token.setTotalSupply(1000000)
            await fixture.bondingManager.setTotalBonded(200000)
            // Set up current reward tokens via RoundsManager
            await fixture.roundsManager.callSetCurrentRewardTokens()

            // Set up reward call via BondingManager
            await fixture.bondingManager.setActiveTranscoder(accounts[1], 0, 100, 100)
            await fixture.bondingManager.reward()

            await expectThrow(fixture.bondingManager.reward())
       })
    })

    describe("transferTokens", () => {
        it("should throw if sender is not bonding manager or jobs manager", async () => {
            await expectThrow(minter.transferTokens(accounts[1], 100))
        })

        it("should transfer tokens to receiving address when sender is bonding manager", async () => {
            await fixture.bondingManager.setWithdrawAmount(100)
            await fixture.bondingManager.withdraw({from: accounts[1]})
        })

        it("should transfer tokens to receiving address when sender is jobs manager", async () => {
            await fixture.jobsManager.setWithdrawAmount(100)
            await fixture.jobsManager.withdraw({from: accounts[1]})
        })
    })

    describe("setCurrentRewardTokens", () => {
        it("should throw if sender is not rounds manager", async () => {
            await expectThrow(minter.setCurrentRewardTokens())
        })

        it("should increase the inflation rate if the current bonding rate is below the target bonding rate", async () => {
            await fixture.token.setTotalSupply(1000)
            await fixture.bondingManager.setTotalBonded(400)

            const startInflation = await minter.inflation.call()
            // Call setCurrentRewardTokens via RoundsManager
            await fixture.roundsManager.callSetCurrentRewardTokens()
            const endInflation = await minter.inflation.call()

            assert.equal(endInflation.sub(startInflation).toNumber(), await minter.inflationChange.call(), "inflation rate did not change correctly")
        })

        it("should decrease the inflation rate if the current bonding rate is above the target bonding rate", async () => {
            await fixture.token.setTotalSupply(1000)
            await fixture.bondingManager.setTotalBonded(600)

            const startInflation = await minter.inflation.call()
            // Call setCurrentRewardTokens via RoundsManager
            await fixture.roundsManager.callSetCurrentRewardTokens()
            const endInflation = await minter.inflation.call()

            assert.equal(startInflation.sub(endInflation).toNumber(), await minter.inflationChange.call(), "inflation rate did not change correctly")
        })

        it("should maintain the inflation rate if the current bonding rate is equal to the target bonding rate", async () => {
            await fixture.token.setTotalSupply(1000)
            await fixture.bondingManager.setTotalBonded(500)

            const startInflation = await minter.inflation.call()
            // Call setCurrentRewardTokens via RoundsManager
            await fixture.roundsManager.callSetCurrentRewardTokens()
            const endInflation = await minter.inflation.call()

            assert.equal(startInflation.sub(endInflation).toNumber(), 0, "inflation rate did not stay the same")
        })
    })
})
