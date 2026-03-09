/* eslint-disable */
import type { DQNCheckpointManifest } from "./game"

export const ADAPTIVE_ARENA_CHECKPOINTS: DQNCheckpointManifest[] = [
  {
    "difficulty": "easy",
    "label": "Easy",
    "summary": "Easy checkpoint (1000 rounds, pure self-play league with 8 opponents).",
    "snapshotInterval": 50,
    "trainingRounds": 1000,
    "parameterCount": 17608,
    "stats": {
      "rounds": 150,
      "botWins": 0,
      "playerWins": 4,
      "draws": 146,
      "botWinRate": 0.0
    },
    "telemetry": {
      "sampleEvery": 50,
      "rollingWindow": 60,
      "points": [
        {
          "round": 512,
          "averageReward": -0.479,
          "averageBotWinRate": 0.133,
          "averageHealthDelta": 6.533,
          "qStateCount": 50000
        },
        {
          "round": 1000,
          "averageReward": -0.165,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -3.233,
          "qStateCount": 50000
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/arena-easy.json"
  },
  {
    "difficulty": "medium",
    "label": "Medium",
    "summary": "Medium checkpoint (3000 rounds, pure self-play league with 12 opponents).",
    "snapshotInterval": 50,
    "trainingRounds": 3000,
    "parameterCount": 17608,
    "stats": {
      "rounds": 200,
      "botWins": 85,
      "playerWins": 0,
      "draws": 115,
      "botWinRate": 0.425
    },
    "telemetry": {
      "sampleEvery": 50,
      "rollingWindow": 60,
      "points": [
        {
          "round": 50,
          "averageReward": 0.538,
          "averageBotWinRate": 1.0,
          "averageHealthDelta": 94.36,
          "qStateCount": 46149
        },
        {
          "round": 512,
          "averageReward": -0.6,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 10.633,
          "qStateCount": 50000
        },
        {
          "round": 552,
          "averageReward": 0.403,
          "averageBotWinRate": 0.583,
          "averageHealthDelta": 27.217,
          "qStateCount": 50000
        },
        {
          "round": 1024,
          "averageReward": 0.372,
          "averageBotWinRate": 0.317,
          "averageHealthDelta": 8.8,
          "qStateCount": 50000
        },
        {
          "round": 1052,
          "averageReward": 0.492,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 12.117,
          "qStateCount": 50000
        },
        {
          "round": 1100,
          "averageReward": 0.817,
          "averageBotWinRate": 0.617,
          "averageHealthDelta": 28.7,
          "qStateCount": 50000
        },
        {
          "round": 1151,
          "averageReward": 0.837,
          "averageBotWinRate": 0.617,
          "averageHealthDelta": 31.633,
          "qStateCount": 50000
        },
        {
          "round": 1550,
          "averageReward": 0.391,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 8.8,
          "qStateCount": 50000
        },
        {
          "round": 1602,
          "averageReward": 0.483,
          "averageBotWinRate": 0.533,
          "averageHealthDelta": 18.683,
          "qStateCount": 50000
        },
        {
          "round": 1650,
          "averageReward": 0.508,
          "averageBotWinRate": 0.733,
          "averageHealthDelta": 17.033,
          "qStateCount": 50000
        },
        {
          "round": 2064,
          "averageReward": 0.578,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 6.267,
          "qStateCount": 50000
        },
        {
          "round": 2100,
          "averageReward": 0.509,
          "averageBotWinRate": 0.367,
          "averageHealthDelta": 5.767,
          "qStateCount": 50000
        },
        {
          "round": 2152,
          "averageReward": 0.513,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 3.4,
          "qStateCount": 50000
        },
        {
          "round": 2202,
          "averageReward": 0.65,
          "averageBotWinRate": 0.367,
          "averageHealthDelta": 5.383,
          "qStateCount": 50000
        },
        {
          "round": 2577,
          "averageReward": 0.471,
          "averageBotWinRate": 0.1,
          "averageHealthDelta": 2.2,
          "qStateCount": 50000
        },
        {
          "round": 2600,
          "averageReward": 0.476,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 3.517,
          "qStateCount": 50000
        },
        {
          "round": 2651,
          "averageReward": 0.818,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 26.167,
          "qStateCount": 50000
        },
        {
          "round": 2700,
          "averageReward": 0.962,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 29.2,
          "qStateCount": 50000
        },
        {
          "round": 2752,
          "averageReward": 0.962,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 34.35,
          "qStateCount": 50000
        },
        {
          "round": 3000,
          "averageReward": 0.814,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 19.833,
          "qStateCount": 50000
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/arena-medium.json"
  },
  {
    "difficulty": "hard",
    "label": "Hard",
    "summary": "Hard checkpoint (6000 rounds, pure self-play league with 15 opponents).",
    "snapshotInterval": 50,
    "trainingRounds": 6000,
    "parameterCount": 17608,
    "stats": {
      "rounds": 300,
      "botWins": 63,
      "playerWins": 7,
      "draws": 230,
      "botWinRate": 0.21
    },
    "telemetry": {
      "sampleEvery": 50,
      "rollingWindow": 60,
      "points": [
        {
          "round": 50,
          "averageReward": 0.867,
          "averageBotWinRate": 1.0,
          "averageHealthDelta": 100.0,
          "qStateCount": 31880
        },
        {
          "round": 102,
          "averageReward": 0.635,
          "averageBotWinRate": 0.983,
          "averageHealthDelta": 95.6,
          "qStateCount": 44170
        },
        {
          "round": 514,
          "averageReward": -0.334,
          "averageBotWinRate": 0.267,
          "averageHealthDelta": 10.317,
          "qStateCount": 50000
        },
        {
          "round": 550,
          "averageReward": -0.429,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 9.4,
          "qStateCount": 50000
        },
        {
          "round": 601,
          "averageReward": 0.165,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 11.2,
          "qStateCount": 50000
        },
        {
          "round": 652,
          "averageReward": 1.282,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 35.017,
          "qStateCount": 50000
        },
        {
          "round": 1027,
          "averageReward": -0.125,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -0.4,
          "qStateCount": 50000
        },
        {
          "round": 1050,
          "averageReward": 0.12,
          "averageBotWinRate": 0.117,
          "averageHealthDelta": 3.85,
          "qStateCount": 50000
        },
        {
          "round": 1101,
          "averageReward": 0.483,
          "averageBotWinRate": 0.2,
          "averageHealthDelta": 6.9,
          "qStateCount": 50000
        },
        {
          "round": 1150,
          "averageReward": 0.356,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": 1.633,
          "qStateCount": 50000
        },
        {
          "round": 1539,
          "averageReward": 0.16,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": 0.0,
          "qStateCount": 50000
        },
        {
          "round": 1550,
          "averageReward": 0.19,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": 0.083,
          "qStateCount": 50000
        },
        {
          "round": 1600,
          "averageReward": 0.426,
          "averageBotWinRate": 0.117,
          "averageHealthDelta": 1.4,
          "qStateCount": 50000
        },
        {
          "round": 1654,
          "averageReward": 0.497,
          "averageBotWinRate": 0.15,
          "averageHealthDelta": 0.583,
          "qStateCount": 50000
        },
        {
          "round": 1701,
          "averageReward": 0.697,
          "averageBotWinRate": 0.183,
          "averageHealthDelta": 3.333,
          "qStateCount": 50000
        },
        {
          "round": 2051,
          "averageReward": 0.468,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": 1.967,
          "qStateCount": 50000
        },
        {
          "round": 2102,
          "averageReward": 0.442,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": 1.067,
          "qStateCount": 50000
        },
        {
          "round": 2152,
          "averageReward": 0.418,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": 0.983,
          "qStateCount": 50000
        },
        {
          "round": 2205,
          "averageReward": 0.328,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -0.4,
          "qStateCount": 50000
        },
        {
          "round": 2563,
          "averageReward": 0.358,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": 0.0,
          "qStateCount": 50000
        },
        {
          "round": 2603,
          "averageReward": 0.314,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": -0.55,
          "qStateCount": 50000
        },
        {
          "round": 2651,
          "averageReward": 0.37,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": -1.133,
          "qStateCount": 50000
        },
        {
          "round": 2704,
          "averageReward": 0.61,
          "averageBotWinRate": 0.133,
          "averageHealthDelta": 2.133,
          "qStateCount": 50000
        },
        {
          "round": 2753,
          "averageReward": 0.381,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": -3.0,
          "qStateCount": 50000
        },
        {
          "round": 3078,
          "averageReward": 0.494,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": 0.5,
          "qStateCount": 50000
        },
        {
          "round": 3100,
          "averageReward": 0.724,
          "averageBotWinRate": 0.133,
          "averageHealthDelta": 4.133,
          "qStateCount": 50000
        },
        {
          "round": 3150,
          "averageReward": 0.669,
          "averageBotWinRate": 0.167,
          "averageHealthDelta": 2.333,
          "qStateCount": 50000
        },
        {
          "round": 3202,
          "averageReward": 0.51,
          "averageBotWinRate": 0.117,
          "averageHealthDelta": -0.283,
          "qStateCount": 50000
        },
        {
          "round": 3256,
          "averageReward": 0.259,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": 0.367,
          "qStateCount": 50000
        },
        {
          "round": 3301,
          "averageReward": 0.083,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": -3.283,
          "qStateCount": 50000
        },
        {
          "round": 3591,
          "averageReward": -0.161,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -3.233,
          "qStateCount": 50000
        },
        {
          "round": 3600,
          "averageReward": -0.128,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -2.767,
          "qStateCount": 50000
        },
        {
          "round": 3650,
          "averageReward": 0.16,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": 0.217,
          "qStateCount": 50000
        },
        {
          "round": 3703,
          "averageReward": 0.119,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -3.367,
          "qStateCount": 50000
        },
        {
          "round": 3751,
          "averageReward": 0.312,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -0.733,
          "qStateCount": 50000
        },
        {
          "round": 3801,
          "averageReward": 0.389,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": 0.933,
          "qStateCount": 50000
        },
        {
          "round": 4104,
          "averageReward": 0.354,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -0.4,
          "qStateCount": 50000
        },
        {
          "round": 4153,
          "averageReward": 0.934,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 10.433,
          "qStateCount": 50000
        },
        {
          "round": 4201,
          "averageReward": 0.876,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 7.367,
          "qStateCount": 50000
        },
        {
          "round": 4251,
          "averageReward": 0.59,
          "averageBotWinRate": 0.2,
          "averageHealthDelta": 7.167,
          "qStateCount": 50000
        },
        {
          "round": 4304,
          "averageReward": 0.442,
          "averageBotWinRate": 0.133,
          "averageHealthDelta": 3.467,
          "qStateCount": 50000
        },
        {
          "round": 4352,
          "averageReward": 0.698,
          "averageBotWinRate": 0.267,
          "averageHealthDelta": 12.417,
          "qStateCount": 50000
        },
        {
          "round": 4400,
          "averageReward": 0.478,
          "averageBotWinRate": 0.167,
          "averageHealthDelta": 5.6,
          "qStateCount": 50000
        },
        {
          "round": 4619,
          "averageReward": 0.409,
          "averageBotWinRate": 0.1,
          "averageHealthDelta": 3.167,
          "qStateCount": 50000
        },
        {
          "round": 4650,
          "averageReward": 0.477,
          "averageBotWinRate": 0.15,
          "averageHealthDelta": 1.5,
          "qStateCount": 50000
        },
        {
          "round": 4703,
          "averageReward": 1.147,
          "averageBotWinRate": 0.533,
          "averageHealthDelta": 18.017,
          "qStateCount": 50000
        },
        {
          "round": 4751,
          "averageReward": 0.419,
          "averageBotWinRate": 0.183,
          "averageHealthDelta": 7.317,
          "qStateCount": 50000
        },
        {
          "round": 4803,
          "averageReward": 0.413,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 11.517,
          "qStateCount": 50000
        },
        {
          "round": 4852,
          "averageReward": 0.582,
          "averageBotWinRate": 0.317,
          "averageHealthDelta": 9.75,
          "qStateCount": 50000
        },
        {
          "round": 4900,
          "averageReward": 0.213,
          "averageBotWinRate": 0.233,
          "averageHealthDelta": 3.1,
          "qStateCount": 50000
        },
        {
          "round": 5132,
          "averageReward": 0.419,
          "averageBotWinRate": 0.117,
          "averageHealthDelta": 2.517,
          "qStateCount": 50000
        },
        {
          "round": 5150,
          "averageReward": 0.453,
          "averageBotWinRate": 0.15,
          "averageHealthDelta": 4.5,
          "qStateCount": 50000
        },
        {
          "round": 5203,
          "averageReward": 0.745,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 12.25,
          "qStateCount": 50000
        },
        {
          "round": 5250,
          "averageReward": 0.599,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 10.317,
          "qStateCount": 50000
        },
        {
          "round": 5303,
          "averageReward": 0.486,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 17.15,
          "qStateCount": 50000
        },
        {
          "round": 5351,
          "averageReward": 0.422,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 9.317,
          "qStateCount": 50000
        },
        {
          "round": 5406,
          "averageReward": 0.388,
          "averageBotWinRate": 0.267,
          "averageHealthDelta": 4.55,
          "qStateCount": 50000
        },
        {
          "round": 5459,
          "averageReward": 0.754,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 18.367,
          "qStateCount": 50000
        },
        {
          "round": 5650,
          "averageReward": 0.455,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 11.917,
          "qStateCount": 50000
        },
        {
          "round": 5702,
          "averageReward": 0.803,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 18.6,
          "qStateCount": 50000
        },
        {
          "round": 5755,
          "averageReward": 0.873,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 25.983,
          "qStateCount": 50000
        },
        {
          "round": 5803,
          "averageReward": 0.766,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 20.55,
          "qStateCount": 50000
        },
        {
          "round": 5851,
          "averageReward": 0.641,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 17.567,
          "qStateCount": 50000
        },
        {
          "round": 5902,
          "averageReward": 0.473,
          "averageBotWinRate": 0.233,
          "averageHealthDelta": 9.167,
          "qStateCount": 50000
        },
        {
          "round": 5952,
          "averageReward": 0.686,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 12.433,
          "qStateCount": 50000
        },
        {
          "round": 6000,
          "averageReward": 0.53,
          "averageBotWinRate": 0.133,
          "averageHealthDelta": 4.65,
          "qStateCount": 50000
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/arena-hard.json"
  },
  {
    "difficulty": "expert",
    "label": "Expert",
    "summary": "Expert checkpoint (12000 rounds, pure self-play league with 20 opponents).",
    "snapshotInterval": 50,
    "trainingRounds": 12000,
    "parameterCount": 17608,
    "stats": {
      "rounds": 400,
      "botWins": 113,
      "playerWins": 10,
      "draws": 277,
      "botWinRate": 0.282
    },
    "telemetry": {
      "sampleEvery": 50,
      "rollingWindow": 60,
      "points": [
        {
          "round": 51,
          "averageReward": 1.426,
          "averageBotWinRate": 0.863,
          "averageHealthDelta": 24.392,
          "qStateCount": 28414
        },
        {
          "round": 101,
          "averageReward": 1.179,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 18.967,
          "qStateCount": 34511
        },
        {
          "round": 153,
          "averageReward": 0.232,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 10.15,
          "qStateCount": 40685
        },
        {
          "round": 200,
          "averageReward": -0.71,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": -15.85,
          "qStateCount": 46814
        },
        {
          "round": 512,
          "averageReward": -2.139,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": -39.1,
          "qStateCount": 49225
        },
        {
          "round": 551,
          "averageReward": 0.102,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 5.067,
          "qStateCount": 50000
        },
        {
          "round": 602,
          "averageReward": 1.085,
          "averageBotWinRate": 0.567,
          "averageHealthDelta": 20.75,
          "qStateCount": 50000
        },
        {
          "round": 653,
          "averageReward": 0.143,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 7.533,
          "qStateCount": 50000
        },
        {
          "round": 700,
          "averageReward": 0.33,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 7.183,
          "qStateCount": 50000
        },
        {
          "round": 750,
          "averageReward": 0.295,
          "averageBotWinRate": 0.283,
          "averageHealthDelta": 6.933,
          "qStateCount": 50000
        },
        {
          "round": 804,
          "averageReward": -0.032,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": -0.3,
          "qStateCount": 50000
        },
        {
          "round": 1045,
          "averageReward": -0.035,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": -0.35,
          "qStateCount": 50000
        },
        {
          "round": 1051,
          "averageReward": 0.092,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": 1.2,
          "qStateCount": 50000
        },
        {
          "round": 1102,
          "averageReward": 0.908,
          "averageBotWinRate": 0.517,
          "averageHealthDelta": 6.467,
          "qStateCount": 50000
        },
        {
          "round": 1152,
          "averageReward": 0.691,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 6.533,
          "qStateCount": 50000
        },
        {
          "round": 1201,
          "averageReward": 0.805,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 4.133,
          "qStateCount": 50000
        },
        {
          "round": 1252,
          "averageReward": 0.563,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 3.183,
          "qStateCount": 50000
        },
        {
          "round": 1300,
          "averageReward": 0.217,
          "averageBotWinRate": 0.217,
          "averageHealthDelta": -2.35,
          "qStateCount": 50000
        },
        {
          "round": 1352,
          "averageReward": 0.469,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 2.1,
          "qStateCount": 50000
        },
        {
          "round": 1401,
          "averageReward": 0.539,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 3.567,
          "qStateCount": 50000
        },
        {
          "round": 1455,
          "averageReward": 0.097,
          "averageBotWinRate": 0.217,
          "averageHealthDelta": -2.2,
          "qStateCount": 50000
        },
        {
          "round": 1504,
          "averageReward": 0.107,
          "averageBotWinRate": 0.217,
          "averageHealthDelta": -3.783,
          "qStateCount": 50000
        },
        {
          "round": 1607,
          "averageReward": -0.12,
          "averageBotWinRate": 0.05,
          "averageHealthDelta": -3.6,
          "qStateCount": 50000
        },
        {
          "round": 1655,
          "averageReward": 0.401,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 0.75,
          "qStateCount": 50000
        },
        {
          "round": 1700,
          "averageReward": 0.613,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 10.617,
          "qStateCount": 50000
        },
        {
          "round": 1753,
          "averageReward": 0.435,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 8.85,
          "qStateCount": 50000
        },
        {
          "round": 1805,
          "averageReward": 0.519,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 7.267,
          "qStateCount": 50000
        },
        {
          "round": 1853,
          "averageReward": 0.494,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 9.8,
          "qStateCount": 50000
        },
        {
          "round": 1900,
          "averageReward": 0.573,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 11.267,
          "qStateCount": 50000
        },
        {
          "round": 1953,
          "averageReward": 0.264,
          "averageBotWinRate": 0.233,
          "averageHealthDelta": 5.3,
          "qStateCount": 50000
        },
        {
          "round": 2003,
          "averageReward": 0.452,
          "averageBotWinRate": 0.317,
          "averageHealthDelta": 13.883,
          "qStateCount": 50000
        },
        {
          "round": 2051,
          "averageReward": 0.471,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 12.517,
          "qStateCount": 50000
        },
        {
          "round": 2102,
          "averageReward": 0.752,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 16.167,
          "qStateCount": 50000
        },
        {
          "round": 2152,
          "averageReward": 0.717,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 5.817,
          "qStateCount": 50000
        },
        {
          "round": 2228,
          "averageReward": 0.466,
          "averageBotWinRate": 0.167,
          "averageHealthDelta": 2.767,
          "qStateCount": 50000
        },
        {
          "round": 2250,
          "averageReward": 0.473,
          "averageBotWinRate": 0.2,
          "averageHealthDelta": 3.2,
          "qStateCount": 50000
        },
        {
          "round": 2304,
          "averageReward": 1.113,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 13.783,
          "qStateCount": 50000
        },
        {
          "round": 2353,
          "averageReward": 1.4,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 28.567,
          "qStateCount": 50000
        },
        {
          "round": 2401,
          "averageReward": 1.304,
          "averageBotWinRate": 0.733,
          "averageHealthDelta": 32.65,
          "qStateCount": 50000
        },
        {
          "round": 2454,
          "averageReward": 1.25,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 32.5,
          "qStateCount": 50000
        },
        {
          "round": 2502,
          "averageReward": 1.287,
          "averageBotWinRate": 0.633,
          "averageHealthDelta": 32.567,
          "qStateCount": 50000
        },
        {
          "round": 2554,
          "averageReward": 1.113,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 25.45,
          "qStateCount": 50000
        },
        {
          "round": 2605,
          "averageReward": 1.357,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 27.45,
          "qStateCount": 50000
        },
        {
          "round": 2654,
          "averageReward": 0.984,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 19.767,
          "qStateCount": 50000
        },
        {
          "round": 2707,
          "averageReward": 1.024,
          "averageBotWinRate": 0.533,
          "averageHealthDelta": 20.167,
          "qStateCount": 50000
        },
        {
          "round": 2750,
          "averageReward": 1.412,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 30.45,
          "qStateCount": 50000
        },
        {
          "round": 2801,
          "averageReward": 1.429,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 27.033,
          "qStateCount": 50000
        },
        {
          "round": 2852,
          "averageReward": 1.363,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 33.383,
          "qStateCount": 50000
        },
        {
          "round": 2903,
          "averageReward": 1.143,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 34.217,
          "qStateCount": 50000
        },
        {
          "round": 2950,
          "averageReward": 1.529,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 44.833,
          "qStateCount": 50000
        },
        {
          "round": 3003,
          "averageReward": 1.688,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 39.133,
          "qStateCount": 50000
        },
        {
          "round": 3050,
          "averageReward": 1.315,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 32.717,
          "qStateCount": 50000
        },
        {
          "round": 3100,
          "averageReward": 1.328,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 40.967,
          "qStateCount": 50000
        },
        {
          "round": 3151,
          "averageReward": 1.695,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 46.05,
          "qStateCount": 50000
        },
        {
          "round": 3201,
          "averageReward": 1.388,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 42.2,
          "qStateCount": 50000
        },
        {
          "round": 3255,
          "averageReward": 1.068,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 46.517,
          "qStateCount": 50000
        },
        {
          "round": 3303,
          "averageReward": 1.282,
          "averageBotWinRate": 0.883,
          "averageHealthDelta": 55.817,
          "qStateCount": 50000
        },
        {
          "round": 3354,
          "averageReward": 1.298,
          "averageBotWinRate": 0.883,
          "averageHealthDelta": 44.75,
          "qStateCount": 50000
        },
        {
          "round": 3400,
          "averageReward": 1.087,
          "averageBotWinRate": 0.917,
          "averageHealthDelta": 47.983,
          "qStateCount": 50000
        },
        {
          "round": 3453,
          "averageReward": 1.025,
          "averageBotWinRate": 0.867,
          "averageHealthDelta": 38.033,
          "qStateCount": 50000
        },
        {
          "round": 3502,
          "averageReward": 1.183,
          "averageBotWinRate": 0.85,
          "averageHealthDelta": 40.683,
          "qStateCount": 50000
        },
        {
          "round": 3560,
          "averageReward": 1.298,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 30.867,
          "qStateCount": 50000
        },
        {
          "round": 3602,
          "averageReward": 1.531,
          "averageBotWinRate": 0.85,
          "averageHealthDelta": 34.683,
          "qStateCount": 50000
        },
        {
          "round": 3654,
          "averageReward": 1.589,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 42.75,
          "qStateCount": 50000
        },
        {
          "round": 3710,
          "averageReward": 1.122,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 24.05,
          "qStateCount": 50000
        },
        {
          "round": 3753,
          "averageReward": 1.329,
          "averageBotWinRate": 0.85,
          "averageHealthDelta": 31.667,
          "qStateCount": 50000
        },
        {
          "round": 3806,
          "averageReward": 1.233,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 30.633,
          "qStateCount": 50000
        },
        {
          "round": 3851,
          "averageReward": 1.091,
          "averageBotWinRate": 0.733,
          "averageHealthDelta": 26.567,
          "qStateCount": 50000
        },
        {
          "round": 3901,
          "averageReward": 1.173,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 24.8,
          "qStateCount": 50000
        },
        {
          "round": 3953,
          "averageReward": 1.229,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 27.867,
          "qStateCount": 50000
        },
        {
          "round": 4007,
          "averageReward": 1.549,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 38.6,
          "qStateCount": 50000
        },
        {
          "round": 4051,
          "averageReward": 1.421,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 35.15,
          "qStateCount": 50000
        },
        {
          "round": 4107,
          "averageReward": 1.433,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 29.9,
          "qStateCount": 50000
        },
        {
          "round": 4155,
          "averageReward": 1.445,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 29.35,
          "qStateCount": 50000
        },
        {
          "round": 4214,
          "averageReward": 1.579,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 34.6,
          "qStateCount": 50000
        },
        {
          "round": 4254,
          "averageReward": 1.373,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 30.517,
          "qStateCount": 50000
        },
        {
          "round": 4300,
          "averageReward": 1.536,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 31.85,
          "qStateCount": 50000
        },
        {
          "round": 4351,
          "averageReward": 1.493,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 31.683,
          "qStateCount": 50000
        },
        {
          "round": 4410,
          "averageReward": 1.123,
          "averageBotWinRate": 0.633,
          "averageHealthDelta": 24.0,
          "qStateCount": 50000
        },
        {
          "round": 4458,
          "averageReward": 1.395,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 27.983,
          "qStateCount": 50000
        },
        {
          "round": 4503,
          "averageReward": 1.722,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 37.05,
          "qStateCount": 50000
        },
        {
          "round": 4557,
          "averageReward": 1.484,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 34.05,
          "qStateCount": 50000
        },
        {
          "round": 4601,
          "averageReward": 1.39,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 28.083,
          "qStateCount": 50000
        },
        {
          "round": 4654,
          "averageReward": 1.633,
          "averageBotWinRate": 0.733,
          "averageHealthDelta": 31.683,
          "qStateCount": 50000
        },
        {
          "round": 4703,
          "averageReward": 2.01,
          "averageBotWinRate": 0.883,
          "averageHealthDelta": 42.167,
          "qStateCount": 50000
        },
        {
          "round": 4755,
          "averageReward": 1.601,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 36.167,
          "qStateCount": 50000
        },
        {
          "round": 4804,
          "averageReward": 1.371,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 27.383,
          "qStateCount": 50000
        },
        {
          "round": 4851,
          "averageReward": 1.706,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 34.183,
          "qStateCount": 50000
        },
        {
          "round": 4900,
          "averageReward": 1.328,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 25.267,
          "qStateCount": 50000
        },
        {
          "round": 4951,
          "averageReward": 1.472,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 22.25,
          "qStateCount": 50000
        },
        {
          "round": 5013,
          "averageReward": 1.393,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 30.817,
          "qStateCount": 50000
        },
        {
          "round": 5060,
          "averageReward": 2.024,
          "averageBotWinRate": 0.867,
          "averageHealthDelta": 41.617,
          "qStateCount": 50000
        },
        {
          "round": 5105,
          "averageReward": 1.787,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 38.817,
          "qStateCount": 50000
        },
        {
          "round": 5158,
          "averageReward": 1.676,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 32.583,
          "qStateCount": 50000
        },
        {
          "round": 5203,
          "averageReward": 1.154,
          "averageBotWinRate": 0.667,
          "averageHealthDelta": 19.85,
          "qStateCount": 50000
        },
        {
          "round": 5251,
          "averageReward": 1.906,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 41.75,
          "qStateCount": 50000
        },
        {
          "round": 5305,
          "averageReward": 1.745,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 36.883,
          "qStateCount": 50000
        },
        {
          "round": 5350,
          "averageReward": 1.926,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 42.333,
          "qStateCount": 50000
        },
        {
          "round": 5406,
          "averageReward": 1.614,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 35.283,
          "qStateCount": 50000
        },
        {
          "round": 5454,
          "averageReward": 1.835,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 43.717,
          "qStateCount": 50000
        },
        {
          "round": 5504,
          "averageReward": 1.95,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 45.067,
          "qStateCount": 50000
        },
        {
          "round": 5550,
          "averageReward": 1.92,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 44.933,
          "qStateCount": 50000
        },
        {
          "round": 5601,
          "averageReward": 1.523,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 35.6,
          "qStateCount": 50000
        },
        {
          "round": 5650,
          "averageReward": 1.33,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 33.55,
          "qStateCount": 50000
        },
        {
          "round": 5705,
          "averageReward": 1.407,
          "averageBotWinRate": 0.683,
          "averageHealthDelta": 30.8,
          "qStateCount": 50000
        },
        {
          "round": 5755,
          "averageReward": 1.698,
          "averageBotWinRate": 0.783,
          "averageHealthDelta": 36.4,
          "qStateCount": 50000
        },
        {
          "round": 5818,
          "averageReward": 1.696,
          "averageBotWinRate": 0.85,
          "averageHealthDelta": 39.45,
          "qStateCount": 50000
        },
        {
          "round": 5859,
          "averageReward": 1.863,
          "averageBotWinRate": 0.9,
          "averageHealthDelta": 41.833,
          "qStateCount": 50000
        },
        {
          "round": 5914,
          "averageReward": 1.814,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 42.933,
          "qStateCount": 50000
        },
        {
          "round": 5955,
          "averageReward": 1.955,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 48.383,
          "qStateCount": 50000
        },
        {
          "round": 6004,
          "averageReward": 1.801,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 38.4,
          "qStateCount": 50000
        },
        {
          "round": 6057,
          "averageReward": 1.462,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 33.283,
          "qStateCount": 50000
        },
        {
          "round": 6100,
          "averageReward": 1.307,
          "averageBotWinRate": 0.667,
          "averageHealthDelta": 29.083,
          "qStateCount": 50000
        },
        {
          "round": 6156,
          "averageReward": 1.194,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 26.333,
          "qStateCount": 50000
        },
        {
          "round": 6204,
          "averageReward": 1.878,
          "averageBotWinRate": 0.9,
          "averageHealthDelta": 42.133,
          "qStateCount": 50000
        },
        {
          "round": 6251,
          "averageReward": 1.791,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 38.2,
          "qStateCount": 50000
        },
        {
          "round": 6309,
          "averageReward": 1.361,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 32.417,
          "qStateCount": 50000
        },
        {
          "round": 6358,
          "averageReward": 1.351,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 30.367,
          "qStateCount": 50000
        },
        {
          "round": 6410,
          "averageReward": 1.673,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 43.967,
          "qStateCount": 50000
        },
        {
          "round": 6454,
          "averageReward": 1.67,
          "averageBotWinRate": 0.867,
          "averageHealthDelta": 39.683,
          "qStateCount": 50000
        },
        {
          "round": 6505,
          "averageReward": 1.26,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 33.283,
          "qStateCount": 50000
        },
        {
          "round": 6551,
          "averageReward": 1.323,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 43.617,
          "qStateCount": 50000
        },
        {
          "round": 6602,
          "averageReward": 1.463,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 39.883,
          "qStateCount": 50000
        },
        {
          "round": 6651,
          "averageReward": 1.716,
          "averageBotWinRate": 0.833,
          "averageHealthDelta": 52.1,
          "qStateCount": 50000
        },
        {
          "round": 6702,
          "averageReward": 1.264,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 37.683,
          "qStateCount": 50000
        },
        {
          "round": 6757,
          "averageReward": 1.737,
          "averageBotWinRate": 0.883,
          "averageHealthDelta": 51.467,
          "qStateCount": 50000
        },
        {
          "round": 6800,
          "averageReward": 1.157,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 34.85,
          "qStateCount": 50000
        },
        {
          "round": 6862,
          "averageReward": 1.469,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 38.617,
          "qStateCount": 50000
        },
        {
          "round": 6904,
          "averageReward": 1.073,
          "averageBotWinRate": 0.583,
          "averageHealthDelta": 26.033,
          "qStateCount": 50000
        },
        {
          "round": 6950,
          "averageReward": 0.665,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 22.55,
          "qStateCount": 50000
        },
        {
          "round": 7001,
          "averageReward": 0.414,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 17.167,
          "qStateCount": 50000
        },
        {
          "round": 7056,
          "averageReward": 0.616,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 11.967,
          "qStateCount": 50000
        },
        {
          "round": 7109,
          "averageReward": 1.182,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 20.883,
          "qStateCount": 50000
        },
        {
          "round": 7154,
          "averageReward": 1.345,
          "averageBotWinRate": 0.617,
          "averageHealthDelta": 26.85,
          "qStateCount": 50000
        },
        {
          "round": 7202,
          "averageReward": 1.887,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 40.35,
          "qStateCount": 50000
        },
        {
          "round": 7252,
          "averageReward": 1.489,
          "averageBotWinRate": 0.667,
          "averageHealthDelta": 27.683,
          "qStateCount": 50000
        },
        {
          "round": 7302,
          "averageReward": 1.469,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 31.067,
          "qStateCount": 50000
        },
        {
          "round": 7351,
          "averageReward": 1.189,
          "averageBotWinRate": 0.567,
          "averageHealthDelta": 23.95,
          "qStateCount": 50000
        },
        {
          "round": 7401,
          "averageReward": 1.221,
          "averageBotWinRate": 0.533,
          "averageHealthDelta": 20.767,
          "qStateCount": 50000
        },
        {
          "round": 7453,
          "averageReward": 1.327,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.883,
          "qStateCount": 50000
        },
        {
          "round": 7500,
          "averageReward": 1.505,
          "averageBotWinRate": 0.567,
          "averageHealthDelta": 28.867,
          "qStateCount": 50000
        },
        {
          "round": 7554,
          "averageReward": 0.948,
          "averageBotWinRate": 0.417,
          "averageHealthDelta": 17.0,
          "qStateCount": 50000
        },
        {
          "round": 7608,
          "averageReward": 0.486,
          "averageBotWinRate": 0.183,
          "averageHealthDelta": 6.467,
          "qStateCount": 50000
        },
        {
          "round": 7659,
          "averageReward": 0.686,
          "averageBotWinRate": 0.233,
          "averageHealthDelta": 11.567,
          "qStateCount": 50000
        },
        {
          "round": 7702,
          "averageReward": 0.87,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 15.683,
          "qStateCount": 50000
        },
        {
          "round": 7757,
          "averageReward": 0.959,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 12.433,
          "qStateCount": 50000
        },
        {
          "round": 7803,
          "averageReward": 0.631,
          "averageBotWinRate": 0.283,
          "averageHealthDelta": 6.817,
          "qStateCount": 50000
        },
        {
          "round": 7850,
          "averageReward": 0.918,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 10.917,
          "qStateCount": 50000
        },
        {
          "round": 7905,
          "averageReward": 0.435,
          "averageBotWinRate": 0.25,
          "averageHealthDelta": 5.8,
          "qStateCount": 50000
        },
        {
          "round": 7953,
          "averageReward": 0.641,
          "averageBotWinRate": 0.283,
          "averageHealthDelta": 9.883,
          "qStateCount": 50000
        },
        {
          "round": 8005,
          "averageReward": 0.938,
          "averageBotWinRate": 0.467,
          "averageHealthDelta": 13.417,
          "qStateCount": 50000
        },
        {
          "round": 8055,
          "averageReward": 0.761,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 13.033,
          "qStateCount": 50000
        },
        {
          "round": 8101,
          "averageReward": 0.618,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 8.0,
          "qStateCount": 50000
        },
        {
          "round": 8152,
          "averageReward": 1.197,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 19.8,
          "qStateCount": 50000
        },
        {
          "round": 8205,
          "averageReward": 1.185,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 16.583,
          "qStateCount": 50000
        },
        {
          "round": 8252,
          "averageReward": 0.941,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 13.183,
          "qStateCount": 50000
        },
        {
          "round": 8301,
          "averageReward": 1.094,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.133,
          "qStateCount": 50000
        },
        {
          "round": 8351,
          "averageReward": 1.388,
          "averageBotWinRate": 0.533,
          "averageHealthDelta": 21.633,
          "qStateCount": 50000
        },
        {
          "round": 8400,
          "averageReward": 0.942,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": 10.383,
          "qStateCount": 50000
        },
        {
          "round": 8451,
          "averageReward": 1.245,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 17.75,
          "qStateCount": 50000
        },
        {
          "round": 8505,
          "averageReward": 1.347,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 24.55,
          "qStateCount": 50000
        },
        {
          "round": 8552,
          "averageReward": 1.333,
          "averageBotWinRate": 0.483,
          "averageHealthDelta": 23.583,
          "qStateCount": 50000
        },
        {
          "round": 8600,
          "averageReward": 1.102,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 18.85,
          "qStateCount": 50000
        },
        {
          "round": 8660,
          "averageReward": 1.194,
          "averageBotWinRate": 0.533,
          "averageHealthDelta": 18.25,
          "qStateCount": 50000
        },
        {
          "round": 8707,
          "averageReward": 1.147,
          "averageBotWinRate": 0.517,
          "averageHealthDelta": 16.567,
          "qStateCount": 50000
        },
        {
          "round": 8757,
          "averageReward": 1.045,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.333,
          "qStateCount": 50000
        },
        {
          "round": 8803,
          "averageReward": 1.032,
          "averageBotWinRate": 0.567,
          "averageHealthDelta": 17.717,
          "qStateCount": 50000
        },
        {
          "round": 8857,
          "averageReward": 1.175,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 18.117,
          "qStateCount": 50000
        },
        {
          "round": 8902,
          "averageReward": 0.541,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 4.783,
          "qStateCount": 50000
        },
        {
          "round": 8952,
          "averageReward": 1.065,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 13.85,
          "qStateCount": 50000
        },
        {
          "round": 9001,
          "averageReward": 0.739,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 10.417,
          "qStateCount": 50000
        },
        {
          "round": 9051,
          "averageReward": 0.7,
          "averageBotWinRate": 0.333,
          "averageHealthDelta": 10.317,
          "qStateCount": 50000
        },
        {
          "round": 9105,
          "averageReward": 0.21,
          "averageBotWinRate": 0.167,
          "averageHealthDelta": -1.0,
          "qStateCount": 50000
        },
        {
          "round": 9150,
          "averageReward": 0.439,
          "averageBotWinRate": 0.167,
          "averageHealthDelta": 0.183,
          "qStateCount": 50000
        },
        {
          "round": 9201,
          "averageReward": 0.497,
          "averageBotWinRate": 0.117,
          "averageHealthDelta": 2.3,
          "qStateCount": 50000
        },
        {
          "round": 9260,
          "averageReward": 0.573,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": 3.5,
          "qStateCount": 50000
        },
        {
          "round": 9305,
          "averageReward": 0.5,
          "averageBotWinRate": 0.05,
          "averageHealthDelta": 2.517,
          "qStateCount": 50000
        },
        {
          "round": 9352,
          "averageReward": 0.51,
          "averageBotWinRate": 0.1,
          "averageHealthDelta": 3.533,
          "qStateCount": 50000
        },
        {
          "round": 9404,
          "averageReward": 0.606,
          "averageBotWinRate": 0.1,
          "averageHealthDelta": 4.2,
          "qStateCount": 50000
        },
        {
          "round": 9452,
          "averageReward": 0.457,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": 1.733,
          "qStateCount": 50000
        },
        {
          "round": 9500,
          "averageReward": 0.49,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": 0.117,
          "qStateCount": 50000
        },
        {
          "round": 9551,
          "averageReward": 0.594,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": 1.233,
          "qStateCount": 50000
        },
        {
          "round": 9602,
          "averageReward": 0.654,
          "averageBotWinRate": 0.1,
          "averageHealthDelta": 2.4,
          "qStateCount": 50000
        },
        {
          "round": 9657,
          "averageReward": 0.59,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": -0.9,
          "qStateCount": 50000
        },
        {
          "round": 9702,
          "averageReward": 0.56,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": -0.5,
          "qStateCount": 50000
        },
        {
          "round": 9753,
          "averageReward": 0.517,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": -0.333,
          "qStateCount": 50000
        },
        {
          "round": 9801,
          "averageReward": 0.522,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": 0.0,
          "qStateCount": 50000
        },
        {
          "round": 9852,
          "averageReward": 0.509,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": 0.0,
          "qStateCount": 50000
        },
        {
          "round": 9902,
          "averageReward": 0.498,
          "averageBotWinRate": 0.0,
          "averageHealthDelta": -0.267,
          "qStateCount": 50000
        },
        {
          "round": 9950,
          "averageReward": 0.532,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": 0.967,
          "qStateCount": 50000
        },
        {
          "round": 10001,
          "averageReward": 0.626,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": 1.733,
          "qStateCount": 50000
        },
        {
          "round": 10051,
          "averageReward": 0.62,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": 1.733,
          "qStateCount": 50000
        },
        {
          "round": 10100,
          "averageReward": 0.677,
          "averageBotWinRate": 0.1,
          "averageHealthDelta": 3.7,
          "qStateCount": 50000
        },
        {
          "round": 10153,
          "averageReward": 0.627,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": 2.683,
          "qStateCount": 50000
        },
        {
          "round": 10205,
          "averageReward": 0.458,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": 0.933,
          "qStateCount": 50000
        },
        {
          "round": 10253,
          "averageReward": 0.31,
          "averageBotWinRate": 0.017,
          "averageHealthDelta": -0.6,
          "qStateCount": 50000
        },
        {
          "round": 10304,
          "averageReward": 0.233,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": -0.333,
          "qStateCount": 50000
        },
        {
          "round": 10359,
          "averageReward": 0.315,
          "averageBotWinRate": 0.067,
          "averageHealthDelta": -1.45,
          "qStateCount": 50000
        },
        {
          "round": 10408,
          "averageReward": 0.579,
          "averageBotWinRate": 0.033,
          "averageHealthDelta": -0.883,
          "qStateCount": 50000
        },
        {
          "round": 10453,
          "averageReward": 0.653,
          "averageBotWinRate": 0.05,
          "averageHealthDelta": 2.1,
          "qStateCount": 50000
        },
        {
          "round": 10501,
          "averageReward": 0.548,
          "averageBotWinRate": 0.083,
          "averageHealthDelta": 0.35,
          "qStateCount": 50000
        },
        {
          "round": 10552,
          "averageReward": 0.749,
          "averageBotWinRate": 0.183,
          "averageHealthDelta": 3.717,
          "qStateCount": 50000
        },
        {
          "round": 10600,
          "averageReward": 0.745,
          "averageBotWinRate": 0.317,
          "averageHealthDelta": 2.05,
          "qStateCount": 50000
        },
        {
          "round": 10656,
          "averageReward": 0.576,
          "averageBotWinRate": 0.2,
          "averageHealthDelta": 2.783,
          "qStateCount": 50000
        },
        {
          "round": 10700,
          "averageReward": 0.64,
          "averageBotWinRate": 0.317,
          "averageHealthDelta": 0.15,
          "qStateCount": 50000
        },
        {
          "round": 10764,
          "averageReward": 1.073,
          "averageBotWinRate": 0.383,
          "averageHealthDelta": 15.517,
          "qStateCount": 50000
        },
        {
          "round": 10800,
          "averageReward": 1.057,
          "averageBotWinRate": 0.367,
          "averageHealthDelta": 17.3,
          "qStateCount": 50000
        },
        {
          "round": 10853,
          "averageReward": 0.824,
          "averageBotWinRate": 0.283,
          "averageHealthDelta": 10.05,
          "qStateCount": 50000
        },
        {
          "round": 10901,
          "averageReward": 0.885,
          "averageBotWinRate": 0.317,
          "averageHealthDelta": 15.483,
          "qStateCount": 50000
        },
        {
          "round": 10955,
          "averageReward": 1.04,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 13.117,
          "qStateCount": 50000
        },
        {
          "round": 11003,
          "averageReward": 1.213,
          "averageBotWinRate": 0.517,
          "averageHealthDelta": 20.65,
          "qStateCount": 50000
        },
        {
          "round": 11052,
          "averageReward": 1.337,
          "averageBotWinRate": 0.567,
          "averageHealthDelta": 30.717,
          "qStateCount": 50000
        },
        {
          "round": 11101,
          "averageReward": 1.374,
          "averageBotWinRate": 0.667,
          "averageHealthDelta": 38.65,
          "qStateCount": 50000
        },
        {
          "round": 11157,
          "averageReward": 1.638,
          "averageBotWinRate": 0.767,
          "averageHealthDelta": 44.6,
          "qStateCount": 50000
        },
        {
          "round": 11201,
          "averageReward": 1.437,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 37.583,
          "qStateCount": 50000
        },
        {
          "round": 11251,
          "averageReward": 1.068,
          "averageBotWinRate": 0.567,
          "averageHealthDelta": 33.633,
          "qStateCount": 50000
        },
        {
          "round": 11308,
          "averageReward": 1.025,
          "averageBotWinRate": 0.633,
          "averageHealthDelta": 29.067,
          "qStateCount": 50000
        },
        {
          "round": 11355,
          "averageReward": 1.443,
          "averageBotWinRate": 0.817,
          "averageHealthDelta": 50.583,
          "qStateCount": 50000
        },
        {
          "round": 11402,
          "averageReward": 1.015,
          "averageBotWinRate": 0.733,
          "averageHealthDelta": 39.533,
          "qStateCount": 50000
        },
        {
          "round": 11450,
          "averageReward": 1.689,
          "averageBotWinRate": 0.85,
          "averageHealthDelta": 55.633,
          "qStateCount": 50000
        },
        {
          "round": 11500,
          "averageReward": 1.463,
          "averageBotWinRate": 0.8,
          "averageHealthDelta": 52.117,
          "qStateCount": 50000
        },
        {
          "round": 11553,
          "averageReward": 0.902,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 46.833,
          "qStateCount": 50000
        },
        {
          "round": 11608,
          "averageReward": 1.517,
          "averageBotWinRate": 0.883,
          "averageHealthDelta": 51.85,
          "qStateCount": 50000
        },
        {
          "round": 11656,
          "averageReward": 1.128,
          "averageBotWinRate": 0.717,
          "averageHealthDelta": 39.283,
          "qStateCount": 50000
        },
        {
          "round": 11704,
          "averageReward": 1.195,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 38.567,
          "qStateCount": 50000
        },
        {
          "round": 11755,
          "averageReward": 1.292,
          "averageBotWinRate": 0.733,
          "averageHealthDelta": 35.65,
          "qStateCount": 50000
        },
        {
          "round": 11802,
          "averageReward": 1.361,
          "averageBotWinRate": 0.633,
          "averageHealthDelta": 34.367,
          "qStateCount": 50000
        },
        {
          "round": 11855,
          "averageReward": 1.237,
          "averageBotWinRate": 0.517,
          "averageHealthDelta": 29.433,
          "qStateCount": 50000
        },
        {
          "round": 11903,
          "averageReward": 1.224,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 28.333,
          "qStateCount": 50000
        },
        {
          "round": 11952,
          "averageReward": 1.024,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 23.467,
          "qStateCount": 50000
        },
        {
          "round": 12000,
          "averageReward": 1.204,
          "averageBotWinRate": 0.433,
          "averageHealthDelta": 21.7,
          "qStateCount": 50000
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/arena-expert.json"
  }
]
