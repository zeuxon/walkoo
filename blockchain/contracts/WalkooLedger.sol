// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WalkooLedger - On-chain mobility proof for the Walkoo app
/// @notice Stores trip completions, point transactions, badge unlocks, and
///         challenge completions on Polygon. Each user is identified by their
///         wallet address. The contract is permissionless: any wallet can
///         record its own data, but cannot modify another user's records.

contract WalkooLedger {

    event TripRecorded(
        address indexed user,
        string tripId,
        uint256 distanceMeters,
        string mode,
        uint256 pointsEarned,
        uint256 completionBonus,
        uint256 timestamp
    );

    event PointsRecorded(
        address indexed user,
        int256 delta,
        string kind,
        string tripId,
        uint256 timestamp
    );

    event BadgeUnlocked(
        address indexed user,
        uint256 badgeId,
        string badgeName,
        uint256 timestamp
    );

    event ChallengeCompleted(
        address indexed user,
        uint256 challengeId,
        string challengeName,
        uint256 timestamp
    );

    struct UserStats {
        uint256 totalTrips;
        uint256 totalDistanceMeters;
        uint256 totalPointsEarned;
        uint256 totalPointsSpent;
        uint256 totalBadges;
        uint256 totalChallenges;
        uint256 firstTripTimestamp;
        uint256 lastTripTimestamp;
    }

    mapping(address => UserStats) public userStats;
    mapping(address => mapping(uint256 => bool)) public hasBadge;
    mapping(address => mapping(uint256 => bool)) public hasCompletedChallenge;

    /// @notice Record a completed trip on-chain
    /// @dev Called by the user's own wallet after trip completion
    function recordTrip(
        string calldata tripId,
        uint256 distanceMeters,
        string calldata mode,
        uint256 pointsEarned,
        uint256 completionBonus
    ) external {
        UserStats storage stats = userStats[msg.sender];

        stats.totalTrips += 1;
        stats.totalDistanceMeters += distanceMeters;
        stats.lastTripTimestamp = block.timestamp;

        if (stats.firstTripTimestamp == 0) {
            stats.firstTripTimestamp = block.timestamp;
        }

        emit TripRecorded(
            msg.sender,
            tripId,
            distanceMeters,
            mode,
            pointsEarned,
            completionBonus,
            block.timestamp
        );
    }

    /// @notice Record a point transaction (earn or spend)
    function recordPoints(
        int256 delta,
        string calldata kind,
        string calldata tripId
    ) external {
        UserStats storage stats = userStats[msg.sender];

        if (delta > 0) {
            stats.totalPointsEarned += uint256(delta);
        } else if (delta < 0) {
            stats.totalPointsSpent += uint256(-delta);
        }

        emit PointsRecorded(
            msg.sender,
            delta,
            kind,
            tripId,
            block.timestamp
        );
    }

    /// @notice Unlock a badge (idempotent - calling twice won't duplicate)
    function unlockBadge(
        uint256 badgeId,
        string calldata badgeName
    ) external {
        if (hasBadge[msg.sender][badgeId]) {
            return;
        }

        hasBadge[msg.sender][badgeId] = true;
        userStats[msg.sender].totalBadges += 1;

        emit BadgeUnlocked(
            msg.sender,
            badgeId,
            badgeName,
            block.timestamp
        );
    }

    /// @notice Record a weekly challenge completion
    function completeChallenge(
        uint256 challengeId,
        string calldata challengeName
    ) external {
        if (hasCompletedChallenge[msg.sender][challengeId]) {
            return;
        }

        hasCompletedChallenge[msg.sender][challengeId] = true;
        userStats[msg.sender].totalChallenges += 1;

        emit ChallengeCompleted(
            msg.sender,
            challengeId,
            challengeName,
            block.timestamp
        );
    }

    /// @notice Get a user's aggregate stats
    function getStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }

    /// @notice Check if a user has a specific badge
    function checkBadge(address user, uint256 badgeId) external view returns (bool) {
        return hasBadge[user][badgeId];
    }

    /// @notice Check if a user completed a specific challenge
    function checkChallenge(address user, uint256 challengeId) external view returns (bool) {
        return hasCompletedChallenge[user][challengeId];
    }
}
