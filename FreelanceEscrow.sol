// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FreelanceEscrow
/// @notice Holds the agreed ETH until the client approves the submitted work
///         or the arbiter resolves a dispute.
contract FreelanceEscrow {
    enum JobStatus {
        Created,   // 0: agreement created; awaiting deposit
        Funded,    // 1: ETH deposited; awaiting work
        Submitted, // 2: work submitted; awaiting client review
        Completed, // 3: ETH released to freelancer
        Disputed,  // 4: awaiting arbiter decision
        Refunded   // 5: ETH returned to client
    }

    struct Job {
        uint256 id;
        string title;
        string description;
        address payable client;
        address payable freelancer;
        uint256 amount;
        uint256 deadline;
        string deliverable;
        JobStatus status;
        uint256 createdAt;
    }

    address public immutable arbiter;
    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    uint256 private _lock = 1;
    modifier nonReentrant() {
        require(_lock == 1, "ReentrancyGuard: reentrant call");
        _lock = 2;
        _;
        _lock = 1;
    }

    event JobCreated(
        uint256 indexed jobId,
        address indexed client,
        address indexed freelancer,
        uint256 amount,
        string title
    );
    event PaymentDeposited(uint256 indexed jobId, address indexed client, uint256 amount);
    event WorkSubmitted(uint256 indexed jobId, address indexed freelancer, string deliverable);
    event PaymentReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event DisputeRaised(uint256 indexed jobId, address indexed raisedBy);
    event DisputeResolved(
        uint256 indexed jobId,
        address indexed recipient,
        uint256 amount,
        bool releasedToFreelancer
    );

    constructor() {
        arbiter = msg.sender;
    }

    /// @notice FR1: Client creates an agreement. Amount is denominated in wei.
    function createJob(
        string calldata _title,
        string calldata _description,
        address payable _freelancer,
        uint256 _amount,
        uint256 _deadline
    ) external returns (uint256) {
        require(bytes(_title).length > 0 && bytes(_title).length <= 100, "Invalid title length");
        require(bytes(_description).length > 0 && bytes(_description).length <= 5000, "Invalid description length");
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_freelancer != msg.sender, "Client cannot be freelancer");
        require(_amount > 0, "Amount must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        uint256 newId = ++jobCount;
        jobs[newId] = Job({
            id: newId,
            title: _title,
            description: _description,
            client: payable(msg.sender),
            freelancer: _freelancer,
            amount: _amount,
            deadline: _deadline,
            deliverable: "",
            status: JobStatus.Created,
            createdAt: block.timestamp
        });

        emit JobCreated(newId, msg.sender, _freelancer, _amount, _title);
        return newId;
    }

    /// @notice FR2: Only the client can deposit the exact agreed amount.
    function depositPayment(uint256 _jobId) external payable {
        Job storage job = _getJob(_jobId);
        require(msg.sender == job.client, "Only client can deposit");
        require(job.status == JobStatus.Created, "Job is not in Created state");
        require(msg.value == job.amount, "Deposit must match agreed amount");

        job.status = JobStatus.Funded;
        emit PaymentDeposited(_jobId, msg.sender, msg.value);
    }

    /// @notice FR3: Freelancer records a URL or content hash.
    ///         Resubmission is allowed while the client has not approved/released payment.
    function submitWork(uint256 _jobId, string calldata _deliverable) external {
        Job storage job = _getJob(_jobId);
        require(msg.sender == job.freelancer, "Only freelancer can submit");
        require(
            job.status == JobStatus.Funded || job.status == JobStatus.Submitted,
            "Job must be Funded or Submitted"
        );
        require(block.timestamp <= job.deadline, "Submission deadline has passed");
        require(bytes(_deliverable).length > 0 && bytes(_deliverable).length <= 2048, "Invalid deliverable");

        job.deliverable = _deliverable;
        job.status = JobStatus.Submitted;
        emit WorkSubmitted(_jobId, msg.sender, _deliverable);
    }

    /// @notice FR4: Client approves the submitted work and releases ETH once.
    function approveAndPay(uint256 _jobId) external nonReentrant {
        Job storage job = _getJob(_jobId);
        require(msg.sender == job.client, "Only client can approve");
        require(job.status == JobStatus.Submitted, "Work not submitted yet");

        // Checks-Effects-Interactions: mark terminal state before sending ETH.
        job.status = JobStatus.Completed;
        (bool success, ) = job.freelancer.call{value: job.amount}("");
        require(success, "ETH transfer failed");

        emit PaymentReleased(_jobId, job.freelancer, job.amount);
    }

    /// @notice FR5: Either party may raise a dispute while escrow funds are locked.
    function raiseDispute(uint256 _jobId) external {
        Job storage job = _getJob(_jobId);
        require(
            msg.sender == job.client || msg.sender == job.freelancer,
            "Only client or freelancer can raise dispute"
        );
        require(
            job.status == JobStatus.Funded || job.status == JobStatus.Submitted,
            "Cannot dispute in current state"
        );

        job.status = JobStatus.Disputed;
        emit DisputeRaised(_jobId, msg.sender);
    }

    /// @notice FR5: Arbiter decides whether to pay the freelancer or refund the client.
    function resolveDispute(uint256 _jobId, bool _releaseToFreelancer) external nonReentrant {
        Job storage job = _getJob(_jobId);
        require(msg.sender == arbiter, "Only arbiter can resolve");
        require(job.status == JobStatus.Disputed, "Job is not disputed");

        address payable recipient;
        if (_releaseToFreelancer) {
            job.status = JobStatus.Completed;
            recipient = job.freelancer;
        } else {
            job.status = JobStatus.Refunded;
            recipient = job.client;
        }

        (bool success, ) = recipient.call{value: job.amount}("");
        require(success, "ETH transfer failed");
        emit DisputeResolved(_jobId, recipient, job.amount, _releaseToFreelancer);
    }

    function _getJob(uint256 _jobId) private view returns (Job storage job) {
        require(_jobId > 0 && _jobId <= jobCount, "Job does not exist");
        job = jobs[_jobId];
    }
}
