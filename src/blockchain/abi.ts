export const WALKOO_LEDGER_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "badgeId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "badgeName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "BadgeUnlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "challengeId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "challengeName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ChallengeCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "delta",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "kind",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "tripId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PointsRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "tripId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "distanceMeters",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "mode",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pointsEarned",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "completionBonus",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "TripRecorded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "badgeId",
        "type": "uint256"
      }
    ],
    "name": "checkBadge",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "challengeId",
        "type": "uint256"
      }
    ],
    "name": "checkChallenge",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "challengeId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "challengeName",
        "type": "string"
      }
    ],
    "name": "completeChallenge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "totalTrips",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalDistanceMeters",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalPointsEarned",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalPointsSpent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBadges",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalChallenges",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "firstTripTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastTripTimestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct WalkooLedger.UserStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "hasBadge",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "hasCompletedChallenge",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "delta",
        "type": "int256"
      },
      {
        "internalType": "string",
        "name": "kind",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "tripId",
        "type": "string"
      }
    ],
    "name": "recordPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "tripId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "distanceMeters",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "mode",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "pointsEarned",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "completionBonus",
        "type": "uint256"
      }
    ],
    "name": "recordTrip",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "badgeId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "badgeName",
        "type": "string"
      }
    ],
    "name": "unlockBadge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalTrips",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalDistanceMeters",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalPointsEarned",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalPointsSpent",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalBadges",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalChallenges",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "firstTripTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastTripTimestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
