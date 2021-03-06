import Fixture from "../test/helpers/fixture"
import expectThrow from "../test/helpers/expectThrow"

const LivepeerVerifier = artifacts.require("LivepeerVerifier")

contract("LivepeerVerifier", accounts => {
    let fixture
    let verifier

    // 2 solvers
    const solvers = accounts.slice(0, 2)
    // IPFS hash of Dockerfile archive
    const codeHash = "QmZmvi1BaYSdxM1Tgwhi2mURabh46xCkzuH9PWeAkAZZGc"

    before(async () => {
        fixture = new Fixture(web3)
        await fixture.deployController()
        await fixture.deployMocks()
        verifier = await LivepeerVerifier.new(fixture.controller.address, solvers, codeHash)
        await fixture.jobsManager.setVerifier(verifier.address)
    })

    beforeEach(async () => {
        await fixture.setUp()
    })

    afterEach(async () => {
        await fixture.tearDown()
    })

    describe("verificationCodeHash", () => {
        it("should return the verification code hash", async () => {
            const hash = await verifier.verificationCodeHash.call()
            assert.equal(hash, codeHash, "verification code hash incorrect")
        })
    })

    describe("verify", () => {
        const jobId = 0
        const claimId = 0
        const segmentNumber = 0
        const transcodingOptions = "0x123"
        const dataStorageHash = "0x123"
        const transcodedDataHash = web3.sha3("hello")

        it("should fail if sender is not the JobsManager", async () => {
            await expectThrow(verifier.verify(jobId, claimId, segmentNumber, transcodingOptions, dataStorageHash, transcodedDataHash))
        })

        it("should store a request", async () => {
            await fixture.jobsManager.setVerifyParams(jobId, claimId, segmentNumber, transcodingOptions, dataStorageHash, transcodedDataHash)
            await fixture.jobsManager.callVerify()

            const request = await verifier.requests.call(0)
            assert.equal(request[0], jobId, "job id incorrect")
            assert.equal(request[1], claimId, "claim id incorrect")
            assert.equal(request[2], segmentNumber, "segment number incorrect")
            assert.equal(request[3], transcodedDataHash, "transcoded data hash incorrect")
        })

        it("should fire a VerifyRequest event", async () => {
            let e = verifier.VerifyRequest({})

            e.watch(async (err, result) => {
                e.stopWatching()

                assert.equal(result.args.requestId, 0, "event requestId incorrect")
                assert.equal(result.args.jobId, jobId, "event jobId incorrect")
                assert.equal(result.args.claimId, claimId, "event claimId incorrect")
                assert.equal(result.args.segmentNumber, segmentNumber, "event segmentNumber incorrect")
                assert.equal(result.args.transcodingOptions, transcodingOptions, "event transcodingOptions incorrect")
                assert.equal(result.args.dataStorageHash, dataStorageHash, "event dataStorageHash incorrect")
                assert.equal(result.args.transcodedDataHash, transcodedDataHash, "event transcodedDataHash incorrect")
            })

            await fixture.jobsManager.setVerifyParams(jobId, claimId, segmentNumber, transcodingOptions, dataStorageHash, transcodedDataHash)
            await fixture.jobsManager.callVerify()
        })
    })

    describe("__callback", () => {
        const jobId = 0
        const claimId = 0
        const segmentNumber = 0
        const transcodingOptions = "0x123"
        const dataStorageHash = "0x123"
        const transcodedDataHash = web3.sha3("hello")

        it("should fail if sender is not a solver", async () => {
            await expectThrow(verifier.__callback(0, "0x123", {from: accounts[3]}))
        })

        it("should fire a callback event with result set to true if verification succeeded", async () => {
            await fixture.jobsManager.setVerifyParams(jobId, claimId, segmentNumber, transcodingOptions, dataStorageHash, transcodedDataHash)
            await fixture.jobsManager.callVerify()

            let e = verifier.Callback({})

            e.watch(async (err, result) => {
                e.stopWatching()

                assert.equal(result.args.requestId, 0, "callback requestId incorrect")
                assert.equal(result.args.jobId, jobId, "callback jobId incorrect")
                assert.equal(result.args.claimId, claimId, "callback claimId incorrect")
                assert.equal(result.args.segmentNumber, segmentNumber, "callback segmentNumber incorrect")
                assert.equal(result.args.result, true, "callback result incorrect")
            })

            await verifier.__callback(0, web3.sha3("hello"), {from: accounts[0]})
        })

        it("should fire a callback event with result set to false if verification failed", async () => {
            await fixture.jobsManager.setVerifyParams(jobId, claimId, segmentNumber, transcodingOptions, dataStorageHash, transcodedDataHash)
            await fixture.jobsManager.callVerify()

            let e = verifier.Callback({})

            e.watch(async (err, result) => {
                e.stopWatching()

                assert.equal(result.args.requestId, 0, "callback requestId incorrect")
                assert.equal(result.args.jobId, jobId, "callback jobId incorrect")
                assert.equal(result.args.claimId, claimId, "callback claimId incorrect")
                assert.equal(result.args.segmentNumber, segmentNumber, "callback segmentNumber incorrect")
                assert.equal(result.args.result, false, "callback result incorrect")
            })

            await verifier.__callback(0, web3.sha3("not hello"), {from: accounts[0]})
        })
    })
})
