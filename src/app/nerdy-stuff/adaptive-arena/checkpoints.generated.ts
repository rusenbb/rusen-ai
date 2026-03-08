/* eslint-disable */
import type { BotCheckpointManifest } from "./game"

export const ADAPTIVE_ARENA_CHECKPOINTS: BotCheckpointManifest[] = [
  {
    "profileId": "duelist",
    "difficulty": "easy",
    "label": "Duelist Easy",
    "summary": "Easy checkpoint trained against aggressor, anchor, scavenger scripted opponents.",
    "curriculum": [
      "aggressor",
      "anchor",
      "scavenger"
    ],
    "trainingRounds": 220,
    "qStateCount": 4338,
    "stats": {
      "rounds": 120,
      "botWins": 87,
      "playerWins": 33,
      "draws": 0,
      "botWinRate": 0.725
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": -0.322,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 8.2,
          "qStateCount": 860
        },
        {
          "round": 50,
          "averageReward": -0.209,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 4.85,
          "qStateCount": 1377
        },
        {
          "round": 75,
          "averageReward": 0.079,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 14.55,
          "qStateCount": 1928
        },
        {
          "round": 100,
          "averageReward": 0.413,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 23.2,
          "qStateCount": 2301
        },
        {
          "round": 125,
          "averageReward": 0.422,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 25.425,
          "qStateCount": 2739
        },
        {
          "round": 150,
          "averageReward": 0.395,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 23.2,
          "qStateCount": 3123
        },
        {
          "round": 175,
          "averageReward": -0.142,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 4.65,
          "qStateCount": 3625
        },
        {
          "round": 200,
          "averageReward": 0.191,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 10.5,
          "qStateCount": 4033
        },
        {
          "round": 220,
          "averageReward": 0.268,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 14.725,
          "qStateCount": 4338
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/duelist-easy.json"
  },
  {
    "profileId": "duelist",
    "difficulty": "medium",
    "label": "Duelist Medium",
    "summary": "Medium checkpoint trained against aggressor, scavenger, sentinel, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "anchor"
    ],
    "trainingRounds": 700,
    "qStateCount": 11478,
    "stats": {
      "rounds": 160,
      "botWins": 117,
      "playerWins": 41,
      "draws": 2,
      "botWinRate": 0.731
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 1.017,
          "averageBotWinRate": 0.76,
          "averageHealthDelta": 45.04,
          "qStateCount": 4702
        },
        {
          "round": 50,
          "averageReward": 1.073,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 43.1,
          "qStateCount": 5052
        },
        {
          "round": 75,
          "averageReward": 0.761,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 34.8,
          "qStateCount": 5406
        },
        {
          "round": 100,
          "averageReward": 0.98,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 39.8,
          "qStateCount": 5708
        },
        {
          "round": 125,
          "averageReward": 1.11,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 42.6,
          "qStateCount": 6053
        },
        {
          "round": 150,
          "averageReward": 1.129,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 42.3,
          "qStateCount": 6341
        },
        {
          "round": 175,
          "averageReward": 0.961,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 38.35,
          "qStateCount": 6699
        },
        {
          "round": 200,
          "averageReward": 0.698,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 34.875,
          "qStateCount": 6973
        },
        {
          "round": 225,
          "averageReward": 1.082,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 44.7,
          "qStateCount": 7218
        },
        {
          "round": 250,
          "averageReward": 1.278,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 43.65,
          "qStateCount": 7437
        },
        {
          "round": 275,
          "averageReward": 1.179,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 38.725,
          "qStateCount": 7667
        },
        {
          "round": 300,
          "averageReward": 1.117,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 38.575,
          "qStateCount": 7889
        },
        {
          "round": 325,
          "averageReward": 1.015,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 41.275,
          "qStateCount": 8166
        },
        {
          "round": 350,
          "averageReward": 1.146,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 38.2,
          "qStateCount": 8366
        },
        {
          "round": 375,
          "averageReward": 1.082,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 33.25,
          "qStateCount": 8574
        },
        {
          "round": 400,
          "averageReward": 0.882,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.65,
          "qStateCount": 8828
        },
        {
          "round": 425,
          "averageReward": 0.791,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 32.15,
          "qStateCount": 9074
        },
        {
          "round": 450,
          "averageReward": 0.848,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 34.15,
          "qStateCount": 9295
        },
        {
          "round": 475,
          "averageReward": 1.019,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 34.025,
          "qStateCount": 9487
        },
        {
          "round": 500,
          "averageReward": 1.024,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 36.875,
          "qStateCount": 9739
        },
        {
          "round": 525,
          "averageReward": 1.484,
          "averageBotWinRate": 0.825,
          "averageHealthDelta": 54.975,
          "qStateCount": 9973
        },
        {
          "round": 550,
          "averageReward": 1.114,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 45.075,
          "qStateCount": 10214
        },
        {
          "round": 575,
          "averageReward": 0.974,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 34.875,
          "qStateCount": 10405
        },
        {
          "round": 600,
          "averageReward": 0.805,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.325,
          "qStateCount": 10660
        },
        {
          "round": 625,
          "averageReward": 0.853,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 29.475,
          "qStateCount": 10926
        },
        {
          "round": 650,
          "averageReward": 1.155,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 39.75,
          "qStateCount": 11132
        },
        {
          "round": 675,
          "averageReward": 1.182,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 42.525,
          "qStateCount": 11312
        },
        {
          "round": 700,
          "averageReward": 1.24,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 43.875,
          "qStateCount": 11478
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/duelist-medium.json"
  },
  {
    "profileId": "duelist",
    "difficulty": "hard",
    "label": "Duelist Hard",
    "summary": "Hard checkpoint trained against aggressor, scavenger, sentinel, flanker, anchor, duelist scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "anchor",
      "duelist"
    ],
    "trainingRounds": 1800,
    "qStateCount": 34683,
    "stats": {
      "rounds": 220,
      "botWins": 148,
      "playerWins": 61,
      "draws": 11,
      "botWinRate": 0.673
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.773,
          "averageBotWinRate": 0.68,
          "averageHealthDelta": 30.16,
          "qStateCount": 11933
        },
        {
          "round": 50,
          "averageReward": 0.611,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 26.9,
          "qStateCount": 12382
        },
        {
          "round": 75,
          "averageReward": 0.69,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 32.225,
          "qStateCount": 12688
        },
        {
          "round": 100,
          "averageReward": 0.466,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 26.725,
          "qStateCount": 13152
        },
        {
          "round": 125,
          "averageReward": 0.716,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 26.325,
          "qStateCount": 13529
        },
        {
          "round": 150,
          "averageReward": 0.626,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 25.75,
          "qStateCount": 13920
        },
        {
          "round": 175,
          "averageReward": 0.701,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 30.225,
          "qStateCount": 14275
        },
        {
          "round": 200,
          "averageReward": 0.445,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 23.675,
          "qStateCount": 14820
        },
        {
          "round": 225,
          "averageReward": 0.638,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.15,
          "qStateCount": 15163
        },
        {
          "round": 250,
          "averageReward": 0.735,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 33.075,
          "qStateCount": 15552
        },
        {
          "round": 275,
          "averageReward": 0.585,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 24.675,
          "qStateCount": 15977
        },
        {
          "round": 300,
          "averageReward": 0.452,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 22.475,
          "qStateCount": 16334
        },
        {
          "round": 325,
          "averageReward": 0.601,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 29.3,
          "qStateCount": 16675
        },
        {
          "round": 350,
          "averageReward": 0.749,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.4,
          "qStateCount": 17006
        },
        {
          "round": 375,
          "averageReward": 0.595,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 24.35,
          "qStateCount": 17411
        },
        {
          "round": 400,
          "averageReward": 0.597,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 27.075,
          "qStateCount": 17899
        },
        {
          "round": 425,
          "averageReward": 0.202,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.175,
          "qStateCount": 18269
        },
        {
          "round": 450,
          "averageReward": 0.272,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.1,
          "qStateCount": 18686
        },
        {
          "round": 475,
          "averageReward": 0.413,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 22.95,
          "qStateCount": 19118
        },
        {
          "round": 500,
          "averageReward": 0.906,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 36.175,
          "qStateCount": 19557
        },
        {
          "round": 525,
          "averageReward": 1.037,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 37.625,
          "qStateCount": 19885
        },
        {
          "round": 550,
          "averageReward": 0.858,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 30.325,
          "qStateCount": 20303
        },
        {
          "round": 575,
          "averageReward": 0.75,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.8,
          "qStateCount": 20588
        },
        {
          "round": 600,
          "averageReward": 0.501,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.6,
          "qStateCount": 20867
        },
        {
          "round": 625,
          "averageReward": 0.53,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 17.725,
          "qStateCount": 21118
        },
        {
          "round": 650,
          "averageReward": 0.532,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 16.625,
          "qStateCount": 21414
        },
        {
          "round": 675,
          "averageReward": 0.68,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.775,
          "qStateCount": 21647
        },
        {
          "round": 700,
          "averageReward": 0.593,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 20.45,
          "qStateCount": 22038
        },
        {
          "round": 725,
          "averageReward": 0.717,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.55,
          "qStateCount": 22332
        },
        {
          "round": 750,
          "averageReward": 0.867,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 29.75,
          "qStateCount": 22616
        },
        {
          "round": 775,
          "averageReward": 0.653,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.75,
          "qStateCount": 22932
        },
        {
          "round": 800,
          "averageReward": 0.815,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 32.975,
          "qStateCount": 23188
        },
        {
          "round": 825,
          "averageReward": 0.577,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 23.95,
          "qStateCount": 23615
        },
        {
          "round": 850,
          "averageReward": 0.547,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.375,
          "qStateCount": 23980
        },
        {
          "round": 875,
          "averageReward": 0.621,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.275,
          "qStateCount": 24374
        },
        {
          "round": 900,
          "averageReward": 0.73,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.8,
          "qStateCount": 24617
        },
        {
          "round": 925,
          "averageReward": 0.588,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.3,
          "qStateCount": 24992
        },
        {
          "round": 950,
          "averageReward": 0.989,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 23.7,
          "qStateCount": 25242
        },
        {
          "round": 975,
          "averageReward": 1.129,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 32.5,
          "qStateCount": 25500
        },
        {
          "round": 1000,
          "averageReward": 0.715,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.5,
          "qStateCount": 25851
        },
        {
          "round": 1025,
          "averageReward": 0.886,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.625,
          "qStateCount": 26121
        },
        {
          "round": 1050,
          "averageReward": 0.955,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 34.2,
          "qStateCount": 26450
        },
        {
          "round": 1075,
          "averageReward": 0.992,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 34.95,
          "qStateCount": 26726
        },
        {
          "round": 1100,
          "averageReward": 0.581,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 20.175,
          "qStateCount": 26982
        },
        {
          "round": 1125,
          "averageReward": 0.334,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 14.475,
          "qStateCount": 27432
        },
        {
          "round": 1150,
          "averageReward": 0.66,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.25,
          "qStateCount": 27716
        },
        {
          "round": 1175,
          "averageReward": 0.922,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.35,
          "qStateCount": 27947
        },
        {
          "round": 1200,
          "averageReward": 0.533,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 19.175,
          "qStateCount": 28204
        },
        {
          "round": 1225,
          "averageReward": 0.622,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.975,
          "qStateCount": 28460
        },
        {
          "round": 1250,
          "averageReward": 0.822,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 23.725,
          "qStateCount": 28720
        },
        {
          "round": 1275,
          "averageReward": 0.771,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.125,
          "qStateCount": 29013
        },
        {
          "round": 1300,
          "averageReward": 0.734,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.75,
          "qStateCount": 29296
        },
        {
          "round": 1325,
          "averageReward": 0.439,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.275,
          "qStateCount": 29592
        },
        {
          "round": 1350,
          "averageReward": 0.331,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.925,
          "qStateCount": 29966
        },
        {
          "round": 1375,
          "averageReward": 0.567,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.275,
          "qStateCount": 30220
        },
        {
          "round": 1400,
          "averageReward": 0.866,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 30.95,
          "qStateCount": 30511
        },
        {
          "round": 1425,
          "averageReward": 0.734,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 27.65,
          "qStateCount": 30842
        },
        {
          "round": 1450,
          "averageReward": 0.416,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 17.1,
          "qStateCount": 31159
        },
        {
          "round": 1475,
          "averageReward": 0.703,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 25.275,
          "qStateCount": 31365
        },
        {
          "round": 1500,
          "averageReward": 0.532,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 21.1,
          "qStateCount": 31738
        },
        {
          "round": 1525,
          "averageReward": 0.439,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.15,
          "qStateCount": 31994
        },
        {
          "round": 1550,
          "averageReward": 0.787,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 31.45,
          "qStateCount": 32279
        },
        {
          "round": 1575,
          "averageReward": 0.64,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 31.375,
          "qStateCount": 32483
        },
        {
          "round": 1600,
          "averageReward": 0.59,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 30.775,
          "qStateCount": 32784
        },
        {
          "round": 1625,
          "averageReward": 0.754,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.925,
          "qStateCount": 32985
        },
        {
          "round": 1650,
          "averageReward": 0.923,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 33.075,
          "qStateCount": 33212
        },
        {
          "round": 1675,
          "averageReward": 1.019,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 36.675,
          "qStateCount": 33420
        },
        {
          "round": 1700,
          "averageReward": 0.956,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 38.5,
          "qStateCount": 33755
        },
        {
          "round": 1725,
          "averageReward": 0.83,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.475,
          "qStateCount": 34001
        },
        {
          "round": 1750,
          "averageReward": 0.84,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 31.85,
          "qStateCount": 34286
        },
        {
          "round": 1775,
          "averageReward": 0.884,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 30.025,
          "qStateCount": 34513
        },
        {
          "round": 1800,
          "averageReward": 1.079,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 33.25,
          "qStateCount": 34683
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/duelist-hard.json"
  },
  {
    "profileId": "duelist",
    "difficulty": "expert",
    "label": "Duelist Expert",
    "summary": "Expert checkpoint trained against aggressor, scavenger, sentinel, flanker, duelist, anchor, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "duelist",
      "anchor",
      "anchor"
    ],
    "trainingRounds": 3600,
    "qStateCount": 64957,
    "stats": {
      "rounds": 280,
      "botWins": 161,
      "playerWins": 107,
      "draws": 12,
      "botWinRate": 0.575
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.842,
          "averageBotWinRate": 0.64,
          "averageHealthDelta": 26.76,
          "qStateCount": 34943
        },
        {
          "round": 50,
          "averageReward": 0.891,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 17.3,
          "qStateCount": 35145
        },
        {
          "round": 75,
          "averageReward": 1.048,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 28.875,
          "qStateCount": 35344
        },
        {
          "round": 100,
          "averageReward": 1.078,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 27.925,
          "qStateCount": 35526
        },
        {
          "round": 125,
          "averageReward": 1.198,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 37.525,
          "qStateCount": 35761
        },
        {
          "round": 150,
          "averageReward": 0.928,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26,
          "qStateCount": 35979
        },
        {
          "round": 175,
          "averageReward": 0.987,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.9,
          "qStateCount": 36240
        },
        {
          "round": 200,
          "averageReward": 1.19,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 34.8,
          "qStateCount": 36517
        },
        {
          "round": 225,
          "averageReward": 0.941,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 24.075,
          "qStateCount": 36695
        },
        {
          "round": 250,
          "averageReward": 0.525,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.025,
          "qStateCount": 36989
        },
        {
          "round": 275,
          "averageReward": 1.015,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 31.225,
          "qStateCount": 37223
        },
        {
          "round": 300,
          "averageReward": 0.948,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 28.575,
          "qStateCount": 37424
        },
        {
          "round": 325,
          "averageReward": 1.152,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 31.2,
          "qStateCount": 37594
        },
        {
          "round": 350,
          "averageReward": 0.815,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 21,
          "qStateCount": 37861
        },
        {
          "round": 375,
          "averageReward": 0.804,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 24.825,
          "qStateCount": 38060
        },
        {
          "round": 400,
          "averageReward": 1.014,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 25.725,
          "qStateCount": 38257
        },
        {
          "round": 425,
          "averageReward": 0.524,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 16.775,
          "qStateCount": 38485
        },
        {
          "round": 450,
          "averageReward": 0.503,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 12.225,
          "qStateCount": 38673
        },
        {
          "round": 475,
          "averageReward": 0.798,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.05,
          "qStateCount": 38888
        },
        {
          "round": 500,
          "averageReward": 0.69,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.4,
          "qStateCount": 39178
        },
        {
          "round": 525,
          "averageReward": 0.675,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 12.875,
          "qStateCount": 39438
        },
        {
          "round": 550,
          "averageReward": 0.605,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 16.25,
          "qStateCount": 39679
        },
        {
          "round": 575,
          "averageReward": 0.4,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 8.45,
          "qStateCount": 39868
        },
        {
          "round": 600,
          "averageReward": 0.739,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 21.05,
          "qStateCount": 40098
        },
        {
          "round": 625,
          "averageReward": 0.843,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.225,
          "qStateCount": 40385
        },
        {
          "round": 650,
          "averageReward": 0.573,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18.175,
          "qStateCount": 40621
        },
        {
          "round": 675,
          "averageReward": 1.074,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.75,
          "qStateCount": 40798
        },
        {
          "round": 700,
          "averageReward": 0.711,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.375,
          "qStateCount": 41153
        },
        {
          "round": 725,
          "averageReward": 0.741,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 19.225,
          "qStateCount": 41339
        },
        {
          "round": 750,
          "averageReward": 0.698,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 19.275,
          "qStateCount": 41541
        },
        {
          "round": 775,
          "averageReward": 0.691,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 22.675,
          "qStateCount": 41806
        },
        {
          "round": 800,
          "averageReward": 0.93,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 25.4,
          "qStateCount": 41978
        },
        {
          "round": 825,
          "averageReward": 0.796,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 20.975,
          "qStateCount": 42275
        },
        {
          "round": 850,
          "averageReward": 0.692,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 16.4,
          "qStateCount": 42502
        },
        {
          "round": 875,
          "averageReward": 0.679,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 17.625,
          "qStateCount": 42758
        },
        {
          "round": 900,
          "averageReward": 0.791,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 20.1,
          "qStateCount": 42944
        },
        {
          "round": 925,
          "averageReward": 1.074,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 20.725,
          "qStateCount": 43103
        },
        {
          "round": 950,
          "averageReward": 0.969,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 26.175,
          "qStateCount": 43324
        },
        {
          "round": 975,
          "averageReward": 0.867,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.725,
          "qStateCount": 43499
        },
        {
          "round": 1000,
          "averageReward": 0.818,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.45,
          "qStateCount": 43746
        },
        {
          "round": 1025,
          "averageReward": 1.019,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.575,
          "qStateCount": 43942
        },
        {
          "round": 1050,
          "averageReward": 0.932,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.3,
          "qStateCount": 44213
        },
        {
          "round": 1075,
          "averageReward": 0.863,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 27.025,
          "qStateCount": 44456
        },
        {
          "round": 1100,
          "averageReward": 0.621,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 16.05,
          "qStateCount": 44689
        },
        {
          "round": 1125,
          "averageReward": 0.883,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.45,
          "qStateCount": 44888
        },
        {
          "round": 1150,
          "averageReward": 0.808,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.325,
          "qStateCount": 45105
        },
        {
          "round": 1175,
          "averageReward": 0.928,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 29.6,
          "qStateCount": 45289
        },
        {
          "round": 1200,
          "averageReward": 1.062,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 27.55,
          "qStateCount": 45527
        },
        {
          "round": 1225,
          "averageReward": 0.742,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.2,
          "qStateCount": 45691
        },
        {
          "round": 1250,
          "averageReward": 0.929,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 24,
          "qStateCount": 45862
        },
        {
          "round": 1275,
          "averageReward": 0.94,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 24.875,
          "qStateCount": 46046
        },
        {
          "round": 1300,
          "averageReward": 0.914,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.7,
          "qStateCount": 46205
        },
        {
          "round": 1325,
          "averageReward": 1.055,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 23.125,
          "qStateCount": 46390
        },
        {
          "round": 1350,
          "averageReward": 1.068,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 25.725,
          "qStateCount": 46694
        },
        {
          "round": 1375,
          "averageReward": 0.781,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.95,
          "qStateCount": 47012
        },
        {
          "round": 1400,
          "averageReward": 0.978,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 30.95,
          "qStateCount": 47253
        },
        {
          "round": 1425,
          "averageReward": 1.123,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 34.75,
          "qStateCount": 47494
        },
        {
          "round": 1450,
          "averageReward": 0.664,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 16.2,
          "qStateCount": 47660
        },
        {
          "round": 1475,
          "averageReward": 0.775,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.6,
          "qStateCount": 47807
        },
        {
          "round": 1500,
          "averageReward": 1.134,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 31.7,
          "qStateCount": 47988
        },
        {
          "round": 1525,
          "averageReward": 0.805,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 25.25,
          "qStateCount": 48169
        },
        {
          "round": 1550,
          "averageReward": 1.205,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 29.325,
          "qStateCount": 48363
        },
        {
          "round": 1575,
          "averageReward": 0.978,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.225,
          "qStateCount": 48521
        },
        {
          "round": 1600,
          "averageReward": 0.838,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18,
          "qStateCount": 48762
        },
        {
          "round": 1625,
          "averageReward": 0.809,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.45,
          "qStateCount": 48925
        },
        {
          "round": 1650,
          "averageReward": 0.87,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 22.95,
          "qStateCount": 49134
        },
        {
          "round": 1675,
          "averageReward": 0.883,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.95,
          "qStateCount": 49303
        },
        {
          "round": 1700,
          "averageReward": 1.022,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 26.9,
          "qStateCount": 49480
        },
        {
          "round": 1725,
          "averageReward": 1.039,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 27.075,
          "qStateCount": 49714
        },
        {
          "round": 1750,
          "averageReward": 0.747,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 20.675,
          "qStateCount": 49988
        },
        {
          "round": 1775,
          "averageReward": 0.847,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.35,
          "qStateCount": 50197
        },
        {
          "round": 1800,
          "averageReward": 0.833,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 22.25,
          "qStateCount": 50424
        },
        {
          "round": 1825,
          "averageReward": 0.882,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.625,
          "qStateCount": 50661
        },
        {
          "round": 1850,
          "averageReward": 0.781,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 18,
          "qStateCount": 50827
        },
        {
          "round": 1875,
          "averageReward": 1.209,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 33.125,
          "qStateCount": 51081
        },
        {
          "round": 1900,
          "averageReward": 1.295,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 29.625,
          "qStateCount": 51235
        },
        {
          "round": 1925,
          "averageReward": 1.115,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 27.75,
          "qStateCount": 51453
        },
        {
          "round": 1950,
          "averageReward": 1.142,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 30.525,
          "qStateCount": 51677
        },
        {
          "round": 1975,
          "averageReward": 0.757,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 18.05,
          "qStateCount": 51834
        },
        {
          "round": 2000,
          "averageReward": 0.824,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 26.1,
          "qStateCount": 52010
        },
        {
          "round": 2025,
          "averageReward": 1.171,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 28.55,
          "qStateCount": 52199
        },
        {
          "round": 2050,
          "averageReward": 1.294,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 35.9,
          "qStateCount": 52374
        },
        {
          "round": 2075,
          "averageReward": 0.87,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 19.7,
          "qStateCount": 52589
        },
        {
          "round": 2100,
          "averageReward": 0.611,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.75,
          "qStateCount": 52846
        },
        {
          "round": 2125,
          "averageReward": 0.833,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 20.775,
          "qStateCount": 53147
        },
        {
          "round": 2150,
          "averageReward": 1.093,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 24.775,
          "qStateCount": 53346
        },
        {
          "round": 2175,
          "averageReward": 0.941,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 28.025,
          "qStateCount": 53614
        },
        {
          "round": 2200,
          "averageReward": 0.909,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 24.2,
          "qStateCount": 53804
        },
        {
          "round": 2225,
          "averageReward": 1.02,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 31.225,
          "qStateCount": 53953
        },
        {
          "round": 2250,
          "averageReward": 0.933,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.125,
          "qStateCount": 54170
        },
        {
          "round": 2275,
          "averageReward": 1.34,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 38.45,
          "qStateCount": 54388
        },
        {
          "round": 2300,
          "averageReward": 0.969,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 32.75,
          "qStateCount": 54552
        },
        {
          "round": 2325,
          "averageReward": 0.886,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.775,
          "qStateCount": 54748
        },
        {
          "round": 2350,
          "averageReward": 1.014,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.975,
          "qStateCount": 54931
        },
        {
          "round": 2375,
          "averageReward": 1.136,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 25.775,
          "qStateCount": 55092
        },
        {
          "round": 2400,
          "averageReward": 1.233,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 33.425,
          "qStateCount": 55281
        },
        {
          "round": 2425,
          "averageReward": 0.93,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 22.3,
          "qStateCount": 55561
        },
        {
          "round": 2450,
          "averageReward": 0.567,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 10.725,
          "qStateCount": 55778
        },
        {
          "round": 2475,
          "averageReward": 0.748,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.275,
          "qStateCount": 56007
        },
        {
          "round": 2500,
          "averageReward": 0.771,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.925,
          "qStateCount": 56237
        },
        {
          "round": 2525,
          "averageReward": 0.987,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 24.425,
          "qStateCount": 56399
        },
        {
          "round": 2550,
          "averageReward": 0.899,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 14.9,
          "qStateCount": 56610
        },
        {
          "round": 2575,
          "averageReward": 0.388,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 10.9,
          "qStateCount": 56866
        },
        {
          "round": 2600,
          "averageReward": 0.835,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 23.175,
          "qStateCount": 57024
        },
        {
          "round": 2625,
          "averageReward": 1.469,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 33.275,
          "qStateCount": 57208
        },
        {
          "round": 2650,
          "averageReward": 1.18,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 26.15,
          "qStateCount": 57336
        },
        {
          "round": 2675,
          "averageReward": 0.723,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.175,
          "qStateCount": 57494
        },
        {
          "round": 2700,
          "averageReward": 0.877,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.45,
          "qStateCount": 57705
        },
        {
          "round": 2725,
          "averageReward": 0.675,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 10.575,
          "qStateCount": 57882
        },
        {
          "round": 2750,
          "averageReward": 0.612,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 12.075,
          "qStateCount": 58108
        },
        {
          "round": 2775,
          "averageReward": 0.753,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 10.75,
          "qStateCount": 58280
        },
        {
          "round": 2800,
          "averageReward": 0.885,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 17.475,
          "qStateCount": 58501
        },
        {
          "round": 2825,
          "averageReward": 0.685,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 17.775,
          "qStateCount": 58688
        },
        {
          "round": 2850,
          "averageReward": 0.798,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 14.9,
          "qStateCount": 58874
        },
        {
          "round": 2875,
          "averageReward": 0.697,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.725,
          "qStateCount": 59123
        },
        {
          "round": 2900,
          "averageReward": 0.688,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 16.2,
          "qStateCount": 59300
        },
        {
          "round": 2925,
          "averageReward": 0.829,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 18.975,
          "qStateCount": 59468
        },
        {
          "round": 2950,
          "averageReward": 0.963,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.525,
          "qStateCount": 59594
        },
        {
          "round": 2975,
          "averageReward": 0.981,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 20.05,
          "qStateCount": 59742
        },
        {
          "round": 3000,
          "averageReward": 0.76,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 15.6,
          "qStateCount": 60000
        },
        {
          "round": 3025,
          "averageReward": 0.768,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.075,
          "qStateCount": 60235
        },
        {
          "round": 3050,
          "averageReward": 0.543,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.2,
          "qStateCount": 60486
        },
        {
          "round": 3075,
          "averageReward": 0.842,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 20.625,
          "qStateCount": 60638
        },
        {
          "round": 3100,
          "averageReward": 1.331,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 37.05,
          "qStateCount": 60786
        },
        {
          "round": 3125,
          "averageReward": 1.046,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 26.175,
          "qStateCount": 61037
        },
        {
          "round": 3150,
          "averageReward": 0.801,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 12.125,
          "qStateCount": 61253
        },
        {
          "round": 3175,
          "averageReward": 0.717,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 17.75,
          "qStateCount": 61481
        },
        {
          "round": 3200,
          "averageReward": 0.817,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 16.35,
          "qStateCount": 61736
        },
        {
          "round": 3225,
          "averageReward": 1.048,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 28,
          "qStateCount": 61882
        },
        {
          "round": 3250,
          "averageReward": 1.085,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.675,
          "qStateCount": 62132
        },
        {
          "round": 3275,
          "averageReward": 1.346,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 40.675,
          "qStateCount": 62284
        },
        {
          "round": 3300,
          "averageReward": 1.103,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 29.475,
          "qStateCount": 62495
        },
        {
          "round": 3325,
          "averageReward": 0.947,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 22.625,
          "qStateCount": 62680
        },
        {
          "round": 3350,
          "averageReward": 0.795,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 19.2,
          "qStateCount": 62899
        },
        {
          "round": 3375,
          "averageReward": 0.393,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.45,
          "qStateCount": 63058
        },
        {
          "round": 3400,
          "averageReward": 0.803,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 23.375,
          "qStateCount": 63268
        },
        {
          "round": 3425,
          "averageReward": 1.078,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.075,
          "qStateCount": 63522
        },
        {
          "round": 3450,
          "averageReward": 1.066,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 32.95,
          "qStateCount": 63783
        },
        {
          "round": 3475,
          "averageReward": 0.844,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 20.175,
          "qStateCount": 63954
        },
        {
          "round": 3500,
          "averageReward": 0.809,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 12.375,
          "qStateCount": 64134
        },
        {
          "round": 3525,
          "averageReward": 0.961,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 15.375,
          "qStateCount": 64328
        },
        {
          "round": 3550,
          "averageReward": 0.755,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.525,
          "qStateCount": 64510
        },
        {
          "round": 3575,
          "averageReward": 0.554,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 19.1,
          "qStateCount": 64753
        },
        {
          "round": 3600,
          "averageReward": 0.702,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.275,
          "qStateCount": 64957
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/duelist-expert.json"
  },
  {
    "profileId": "bastion",
    "difficulty": "easy",
    "label": "Bastion Easy",
    "summary": "Easy checkpoint trained against aggressor, anchor, scavenger scripted opponents.",
    "curriculum": [
      "aggressor",
      "anchor",
      "scavenger"
    ],
    "trainingRounds": 220,
    "qStateCount": 7507,
    "stats": {
      "rounds": 120,
      "botWins": 69,
      "playerWins": 45,
      "draws": 6,
      "botWinRate": 0.575
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": -0.479,
          "averageBotWinRate": 0.56,
          "averageHealthDelta": 18.32,
          "qStateCount": 1349
        },
        {
          "round": 50,
          "averageReward": -0.278,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.275,
          "qStateCount": 2338
        },
        {
          "round": 75,
          "averageReward": -0.272,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.075,
          "qStateCount": 3175
        },
        {
          "round": 100,
          "averageReward": -0.181,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.925,
          "qStateCount": 3894
        },
        {
          "round": 125,
          "averageReward": -0.336,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 2.175,
          "qStateCount": 4617
        },
        {
          "round": 150,
          "averageReward": -0.755,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -7.6,
          "qStateCount": 5421
        },
        {
          "round": 175,
          "averageReward": -0.562,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 7.025,
          "qStateCount": 6286
        },
        {
          "round": 200,
          "averageReward": -0.115,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 20.525,
          "qStateCount": 6874
        },
        {
          "round": 220,
          "averageReward": -0.341,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 15.675,
          "qStateCount": 7507
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/bastion-easy.json"
  },
  {
    "profileId": "bastion",
    "difficulty": "medium",
    "label": "Bastion Medium",
    "summary": "Medium checkpoint trained against aggressor, scavenger, sentinel, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "anchor"
    ],
    "trainingRounds": 700,
    "qStateCount": 21417,
    "stats": {
      "rounds": 160,
      "botWins": 93,
      "playerWins": 55,
      "draws": 12,
      "botWinRate": 0.581
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.312,
          "averageBotWinRate": 0.64,
          "averageHealthDelta": 37.72,
          "qStateCount": 8214
        },
        {
          "round": 50,
          "averageReward": 0.228,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 32.95,
          "qStateCount": 8852
        },
        {
          "round": 75,
          "averageReward": 0.513,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 42.05,
          "qStateCount": 9415
        },
        {
          "round": 100,
          "averageReward": 0.824,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 47.875,
          "qStateCount": 9878
        },
        {
          "round": 125,
          "averageReward": 0.205,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 35.925,
          "qStateCount": 10519
        },
        {
          "round": 150,
          "averageReward": 0.029,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 33.575,
          "qStateCount": 11109
        },
        {
          "round": 175,
          "averageReward": 0.124,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 34.475,
          "qStateCount": 11691
        },
        {
          "round": 200,
          "averageReward": 0.058,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.45,
          "qStateCount": 12194
        },
        {
          "round": 225,
          "averageReward": 0.34,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.45,
          "qStateCount": 12782
        },
        {
          "round": 250,
          "averageReward": 0.325,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 37.15,
          "qStateCount": 13291
        },
        {
          "round": 275,
          "averageReward": 0.262,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 30.025,
          "qStateCount": 13726
        },
        {
          "round": 300,
          "averageReward": 0.026,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 28.95,
          "qStateCount": 14146
        },
        {
          "round": 325,
          "averageReward": 0.111,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 32.975,
          "qStateCount": 14572
        },
        {
          "round": 350,
          "averageReward": 0.453,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 37.225,
          "qStateCount": 15020
        },
        {
          "round": 375,
          "averageReward": 0.359,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 34.8,
          "qStateCount": 15709
        },
        {
          "round": 400,
          "averageReward": 0.386,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.9,
          "qStateCount": 16129
        },
        {
          "round": 425,
          "averageReward": 0.473,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 36.275,
          "qStateCount": 16505
        },
        {
          "round": 450,
          "averageReward": 0.476,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 40.3,
          "qStateCount": 17090
        },
        {
          "round": 475,
          "averageReward": 0.561,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 42.85,
          "qStateCount": 17441
        },
        {
          "round": 500,
          "averageReward": 0.213,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 33.5,
          "qStateCount": 18091
        },
        {
          "round": 525,
          "averageReward": -0.025,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.925,
          "qStateCount": 18573
        },
        {
          "round": 550,
          "averageReward": 0.257,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 36.225,
          "qStateCount": 19024
        },
        {
          "round": 575,
          "averageReward": 0.841,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 49.225,
          "qStateCount": 19308
        },
        {
          "round": 600,
          "averageReward": 0.537,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 49.025,
          "qStateCount": 19671
        },
        {
          "round": 625,
          "averageReward": 0.23,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 36.6,
          "qStateCount": 20105
        },
        {
          "round": 650,
          "averageReward": 0.35,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 38.475,
          "qStateCount": 20626
        },
        {
          "round": 675,
          "averageReward": 0.665,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 47.775,
          "qStateCount": 20996
        },
        {
          "round": 700,
          "averageReward": 0.417,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 44.55,
          "qStateCount": 21417
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/bastion-medium.json"
  },
  {
    "profileId": "bastion",
    "difficulty": "hard",
    "label": "Bastion Hard",
    "summary": "Hard checkpoint trained against aggressor, scavenger, sentinel, flanker, anchor, duelist scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "anchor",
      "duelist"
    ],
    "trainingRounds": 1800,
    "qStateCount": 67388,
    "stats": {
      "rounds": 220,
      "botWins": 104,
      "playerWins": 106,
      "draws": 10,
      "botWinRate": 0.473
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": -0.447,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 8.56,
          "qStateCount": 22395
        },
        {
          "round": 50,
          "averageReward": -0.252,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 17.3,
          "qStateCount": 23399
        },
        {
          "round": 75,
          "averageReward": -0.349,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 14.55,
          "qStateCount": 24213
        },
        {
          "round": 100,
          "averageReward": -0.387,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 16.175,
          "qStateCount": 25097
        },
        {
          "round": 125,
          "averageReward": -0.9,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -3.325,
          "qStateCount": 25934
        },
        {
          "round": 150,
          "averageReward": -1.02,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -5.75,
          "qStateCount": 26600
        },
        {
          "round": 175,
          "averageReward": -0.719,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8.55,
          "qStateCount": 27433
        },
        {
          "round": 200,
          "averageReward": -0.633,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 6.25,
          "qStateCount": 28267
        },
        {
          "round": 225,
          "averageReward": -0.165,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.525,
          "qStateCount": 28856
        },
        {
          "round": 250,
          "averageReward": -0.121,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.3,
          "qStateCount": 29457
        },
        {
          "round": 275,
          "averageReward": -0.427,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 14.525,
          "qStateCount": 30246
        },
        {
          "round": 300,
          "averageReward": -0.139,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.05,
          "qStateCount": 30855
        },
        {
          "round": 325,
          "averageReward": -0.284,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.575,
          "qStateCount": 31616
        },
        {
          "round": 350,
          "averageReward": -0.812,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 2.175,
          "qStateCount": 32295
        },
        {
          "round": 375,
          "averageReward": -0.504,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 8.525,
          "qStateCount": 32872
        },
        {
          "round": 400,
          "averageReward": -0.49,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 8.525,
          "qStateCount": 33770
        },
        {
          "round": 425,
          "averageReward": -0.571,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": 3.525,
          "qStateCount": 34454
        },
        {
          "round": 450,
          "averageReward": -0.35,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 4.3,
          "qStateCount": 35103
        },
        {
          "round": 475,
          "averageReward": -0.543,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 10.875,
          "qStateCount": 35887
        },
        {
          "round": 500,
          "averageReward": -0.257,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 19.925,
          "qStateCount": 36387
        },
        {
          "round": 525,
          "averageReward": -0.706,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": 8.575,
          "qStateCount": 37095
        },
        {
          "round": 550,
          "averageReward": -0.42,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 16.175,
          "qStateCount": 37803
        },
        {
          "round": 575,
          "averageReward": -0.28,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.55,
          "qStateCount": 38428
        },
        {
          "round": 600,
          "averageReward": -0.228,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 13.35,
          "qStateCount": 39041
        },
        {
          "round": 625,
          "averageReward": -0.239,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 15.025,
          "qStateCount": 39614
        },
        {
          "round": 650,
          "averageReward": -0.207,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.025,
          "qStateCount": 40388
        },
        {
          "round": 675,
          "averageReward": -0.128,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.575,
          "qStateCount": 40971
        },
        {
          "round": 700,
          "averageReward": 0.021,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 30.35,
          "qStateCount": 41659
        },
        {
          "round": 725,
          "averageReward": -0.23,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.85,
          "qStateCount": 42272
        },
        {
          "round": 750,
          "averageReward": 0.061,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.7,
          "qStateCount": 43029
        },
        {
          "round": 775,
          "averageReward": -0.446,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.75,
          "qStateCount": 43654
        },
        {
          "round": 800,
          "averageReward": -0.661,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 9.85,
          "qStateCount": 44231
        },
        {
          "round": 825,
          "averageReward": -0.668,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 5.225,
          "qStateCount": 44818
        },
        {
          "round": 850,
          "averageReward": -0.145,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.575,
          "qStateCount": 45412
        },
        {
          "round": 875,
          "averageReward": -0.132,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 25.6,
          "qStateCount": 45996
        },
        {
          "round": 900,
          "averageReward": -0.328,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.95,
          "qStateCount": 46626
        },
        {
          "round": 925,
          "averageReward": -0.354,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 10.225,
          "qStateCount": 47126
        },
        {
          "round": 950,
          "averageReward": -0.008,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.05,
          "qStateCount": 47732
        },
        {
          "round": 975,
          "averageReward": -0.096,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 21.625,
          "qStateCount": 48502
        },
        {
          "round": 1000,
          "averageReward": -0.289,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.2,
          "qStateCount": 49131
        },
        {
          "round": 1025,
          "averageReward": -0.391,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 16.3,
          "qStateCount": 49751
        },
        {
          "round": 1050,
          "averageReward": -0.479,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 5.9,
          "qStateCount": 50270
        },
        {
          "round": 1075,
          "averageReward": -0.535,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.025,
          "qStateCount": 50821
        },
        {
          "round": 1100,
          "averageReward": -0.045,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 28.125,
          "qStateCount": 51381
        },
        {
          "round": 1125,
          "averageReward": -0.504,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 12.8,
          "qStateCount": 52160
        },
        {
          "round": 1150,
          "averageReward": 0.062,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.575,
          "qStateCount": 52778
        },
        {
          "round": 1175,
          "averageReward": -0.187,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.2,
          "qStateCount": 53421
        },
        {
          "round": 1200,
          "averageReward": -0.205,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.45,
          "qStateCount": 53821
        },
        {
          "round": 1225,
          "averageReward": 0.054,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.4,
          "qStateCount": 54522
        },
        {
          "round": 1250,
          "averageReward": 0.151,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.925,
          "qStateCount": 55087
        },
        {
          "round": 1275,
          "averageReward": -0.237,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 20.05,
          "qStateCount": 55675
        },
        {
          "round": 1300,
          "averageReward": -0.371,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 11.875,
          "qStateCount": 56270
        },
        {
          "round": 1325,
          "averageReward": -0.448,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.25,
          "qStateCount": 56962
        },
        {
          "round": 1350,
          "averageReward": -0.405,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 13.2,
          "qStateCount": 57425
        },
        {
          "round": 1375,
          "averageReward": -0.343,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.6,
          "qStateCount": 57940
        },
        {
          "round": 1400,
          "averageReward": -0.265,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 16.525,
          "qStateCount": 58480
        },
        {
          "round": 1425,
          "averageReward": -0.229,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.9,
          "qStateCount": 58963
        },
        {
          "round": 1450,
          "averageReward": -0.236,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.325,
          "qStateCount": 59540
        },
        {
          "round": 1475,
          "averageReward": 0.106,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 30,
          "qStateCount": 59953
        },
        {
          "round": 1500,
          "averageReward": 0.217,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 28.175,
          "qStateCount": 60447
        },
        {
          "round": 1525,
          "averageReward": -0.248,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 11.225,
          "qStateCount": 61020
        },
        {
          "round": 1550,
          "averageReward": -0.396,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 13.55,
          "qStateCount": 61556
        },
        {
          "round": 1575,
          "averageReward": -0.044,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.5,
          "qStateCount": 62174
        },
        {
          "round": 1600,
          "averageReward": 0.081,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 29.325,
          "qStateCount": 62872
        },
        {
          "round": 1625,
          "averageReward": -0.635,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 1.85,
          "qStateCount": 63385
        },
        {
          "round": 1650,
          "averageReward": -0.56,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 6.375,
          "qStateCount": 64062
        },
        {
          "round": 1675,
          "averageReward": -0.147,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 25.55,
          "qStateCount": 64454
        },
        {
          "round": 1700,
          "averageReward": -0.427,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 12.1,
          "qStateCount": 64945
        },
        {
          "round": 1725,
          "averageReward": -0.129,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.15,
          "qStateCount": 65446
        },
        {
          "round": 1750,
          "averageReward": -0.038,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18.05,
          "qStateCount": 66070
        },
        {
          "round": 1775,
          "averageReward": -0.126,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.1,
          "qStateCount": 66584
        },
        {
          "round": 1800,
          "averageReward": -0.517,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18.75,
          "qStateCount": 67388
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/bastion-hard.json"
  },
  {
    "profileId": "bastion",
    "difficulty": "expert",
    "label": "Bastion Expert",
    "summary": "Expert checkpoint trained against aggressor, scavenger, sentinel, flanker, duelist, anchor, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "duelist",
      "anchor",
      "anchor"
    ],
    "trainingRounds": 3600,
    "qStateCount": 131258,
    "stats": {
      "rounds": 280,
      "botWins": 153,
      "playerWins": 105,
      "draws": 22,
      "botWinRate": 0.546
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.013,
          "averageBotWinRate": 0.56,
          "averageHealthDelta": 22.52,
          "qStateCount": 68022
        },
        {
          "round": 50,
          "averageReward": 0.389,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.875,
          "qStateCount": 68592
        },
        {
          "round": 75,
          "averageReward": 0.31,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.125,
          "qStateCount": 69127
        },
        {
          "round": 100,
          "averageReward": 0.126,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.625,
          "qStateCount": 69666
        },
        {
          "round": 125,
          "averageReward": 0.179,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 26.775,
          "qStateCount": 70269
        },
        {
          "round": 150,
          "averageReward": 0.354,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.575,
          "qStateCount": 70729
        },
        {
          "round": 175,
          "averageReward": 0.251,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.8,
          "qStateCount": 71337
        },
        {
          "round": 200,
          "averageReward": 0.126,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.675,
          "qStateCount": 71939
        },
        {
          "round": 225,
          "averageReward": -0.26,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18.325,
          "qStateCount": 72538
        },
        {
          "round": 250,
          "averageReward": -0.27,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 18.9,
          "qStateCount": 73007
        },
        {
          "round": 275,
          "averageReward": 0.368,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.825,
          "qStateCount": 73509
        },
        {
          "round": 300,
          "averageReward": 0.577,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.4,
          "qStateCount": 74121
        },
        {
          "round": 325,
          "averageReward": 0.535,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 35.05,
          "qStateCount": 74563
        },
        {
          "round": 350,
          "averageReward": 0.325,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.125,
          "qStateCount": 75141
        },
        {
          "round": 375,
          "averageReward": 0.227,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.2,
          "qStateCount": 75591
        },
        {
          "round": 400,
          "averageReward": 0.422,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.35,
          "qStateCount": 75991
        },
        {
          "round": 425,
          "averageReward": 0.495,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 30.4,
          "qStateCount": 76431
        },
        {
          "round": 450,
          "averageReward": 0.18,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.575,
          "qStateCount": 76863
        },
        {
          "round": 475,
          "averageReward": 0.367,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 32.45,
          "qStateCount": 77313
        },
        {
          "round": 500,
          "averageReward": 0.184,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 22.225,
          "qStateCount": 77709
        },
        {
          "round": 525,
          "averageReward": -0.046,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.375,
          "qStateCount": 78289
        },
        {
          "round": 550,
          "averageReward": 0.341,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 28.75,
          "qStateCount": 78667
        },
        {
          "round": 575,
          "averageReward": 0.208,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 20.975,
          "qStateCount": 79056
        },
        {
          "round": 600,
          "averageReward": 0.082,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.6,
          "qStateCount": 79568
        },
        {
          "round": 625,
          "averageReward": 0.248,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.125,
          "qStateCount": 79942
        },
        {
          "round": 650,
          "averageReward": 0.294,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.175,
          "qStateCount": 80501
        },
        {
          "round": 675,
          "averageReward": 0.676,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.4,
          "qStateCount": 80849
        },
        {
          "round": 700,
          "averageReward": 0.119,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 25.225,
          "qStateCount": 81338
        },
        {
          "round": 725,
          "averageReward": 0.065,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18.225,
          "qStateCount": 81801
        },
        {
          "round": 750,
          "averageReward": 0.151,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 16.95,
          "qStateCount": 82316
        },
        {
          "round": 775,
          "averageReward": 0.091,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.175,
          "qStateCount": 82674
        },
        {
          "round": 800,
          "averageReward": 0.464,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 34.225,
          "qStateCount": 83180
        },
        {
          "round": 825,
          "averageReward": 0.552,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 36.075,
          "qStateCount": 83563
        },
        {
          "round": 850,
          "averageReward": 0.442,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 28.625,
          "qStateCount": 83878
        },
        {
          "round": 875,
          "averageReward": 0.247,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 21.325,
          "qStateCount": 84512
        },
        {
          "round": 900,
          "averageReward": -0.108,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.075,
          "qStateCount": 85022
        },
        {
          "round": 925,
          "averageReward": 0.032,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.35,
          "qStateCount": 85352
        },
        {
          "round": 950,
          "averageReward": 0.334,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.4,
          "qStateCount": 85856
        },
        {
          "round": 975,
          "averageReward": 0.319,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.975,
          "qStateCount": 86247
        },
        {
          "round": 1000,
          "averageReward": 0.244,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 16.6,
          "qStateCount": 86744
        },
        {
          "round": 1025,
          "averageReward": 0.559,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 28.9,
          "qStateCount": 87173
        },
        {
          "round": 1050,
          "averageReward": 0.312,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.55,
          "qStateCount": 87687
        },
        {
          "round": 1075,
          "averageReward": 0.021,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25,
          "qStateCount": 88158
        },
        {
          "round": 1100,
          "averageReward": 0.402,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 32.625,
          "qStateCount": 88528
        },
        {
          "round": 1125,
          "averageReward": 0.234,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.425,
          "qStateCount": 89036
        },
        {
          "round": 1150,
          "averageReward": 0.199,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.35,
          "qStateCount": 89424
        },
        {
          "round": 1175,
          "averageReward": 0.013,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 19.875,
          "qStateCount": 89845
        },
        {
          "round": 1200,
          "averageReward": 0.334,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.45,
          "qStateCount": 90279
        },
        {
          "round": 1225,
          "averageReward": -0.007,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 12.925,
          "qStateCount": 90961
        },
        {
          "round": 1250,
          "averageReward": -0.353,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 9.325,
          "qStateCount": 91464
        },
        {
          "round": 1275,
          "averageReward": -0.227,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.35,
          "qStateCount": 92035
        },
        {
          "round": 1300,
          "averageReward": -0.386,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 9.95,
          "qStateCount": 92386
        },
        {
          "round": 1325,
          "averageReward": 0.148,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.425,
          "qStateCount": 92902
        },
        {
          "round": 1350,
          "averageReward": -0.006,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.025,
          "qStateCount": 93412
        },
        {
          "round": 1375,
          "averageReward": 0.144,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.525,
          "qStateCount": 93773
        },
        {
          "round": 1400,
          "averageReward": 0.435,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 21.625,
          "qStateCount": 94184
        },
        {
          "round": 1425,
          "averageReward": 0.576,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 32.825,
          "qStateCount": 94575
        },
        {
          "round": 1450,
          "averageReward": 0.304,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.425,
          "qStateCount": 94904
        },
        {
          "round": 1475,
          "averageReward": 0.101,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 15.775,
          "qStateCount": 95389
        },
        {
          "round": 1500,
          "averageReward": 0.36,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 25.45,
          "qStateCount": 95773
        },
        {
          "round": 1525,
          "averageReward": 0.238,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 27.8,
          "qStateCount": 96158
        },
        {
          "round": 1550,
          "averageReward": 0.387,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 26.225,
          "qStateCount": 96510
        },
        {
          "round": 1575,
          "averageReward": 0.282,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.175,
          "qStateCount": 96960
        },
        {
          "round": 1600,
          "averageReward": 0.201,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.15,
          "qStateCount": 97303
        },
        {
          "round": 1625,
          "averageReward": 0.617,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 26.825,
          "qStateCount": 97692
        },
        {
          "round": 1650,
          "averageReward": 0.439,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 27.325,
          "qStateCount": 98089
        },
        {
          "round": 1675,
          "averageReward": 0.422,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 21.8,
          "qStateCount": 98574
        },
        {
          "round": 1700,
          "averageReward": 0.609,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 32.075,
          "qStateCount": 99014
        },
        {
          "round": 1725,
          "averageReward": 0.277,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.675,
          "qStateCount": 99367
        },
        {
          "round": 1750,
          "averageReward": 0.484,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 30.2,
          "qStateCount": 99785
        },
        {
          "round": 1775,
          "averageReward": 0.627,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 29.675,
          "qStateCount": 100263
        },
        {
          "round": 1800,
          "averageReward": 0.516,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 26.475,
          "qStateCount": 100664
        },
        {
          "round": 1825,
          "averageReward": 0.196,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 22.375,
          "qStateCount": 101108
        },
        {
          "round": 1850,
          "averageReward": 0.163,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.125,
          "qStateCount": 101608
        },
        {
          "round": 1875,
          "averageReward": 0.073,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 11.55,
          "qStateCount": 102014
        },
        {
          "round": 1900,
          "averageReward": 0.436,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.175,
          "qStateCount": 102445
        },
        {
          "round": 1925,
          "averageReward": 0.605,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 30.55,
          "qStateCount": 102840
        },
        {
          "round": 1950,
          "averageReward": 0.258,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.075,
          "qStateCount": 103209
        },
        {
          "round": 1975,
          "averageReward": -0.189,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8.025,
          "qStateCount": 103550
        },
        {
          "round": 2000,
          "averageReward": -0.134,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.65,
          "qStateCount": 103954
        },
        {
          "round": 2025,
          "averageReward": 0.138,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 20.375,
          "qStateCount": 104407
        },
        {
          "round": 2050,
          "averageReward": 0.219,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.475,
          "qStateCount": 104840
        },
        {
          "round": 2075,
          "averageReward": 0.245,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 22.175,
          "qStateCount": 105150
        },
        {
          "round": 2100,
          "averageReward": 0.557,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 33.775,
          "qStateCount": 105750
        },
        {
          "round": 2125,
          "averageReward": 0.162,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 20.7,
          "qStateCount": 106260
        },
        {
          "round": 2150,
          "averageReward": 0.21,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 20.625,
          "qStateCount": 106677
        },
        {
          "round": 2175,
          "averageReward": 0.337,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.85,
          "qStateCount": 107177
        },
        {
          "round": 2200,
          "averageReward": 0.235,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 20.475,
          "qStateCount": 107496
        },
        {
          "round": 2225,
          "averageReward": 0.706,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 33.85,
          "qStateCount": 107965
        },
        {
          "round": 2250,
          "averageReward": 0.383,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.95,
          "qStateCount": 108321
        },
        {
          "round": 2275,
          "averageReward": 0.17,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 17.75,
          "qStateCount": 108811
        },
        {
          "round": 2300,
          "averageReward": -0.007,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 12.975,
          "qStateCount": 109300
        },
        {
          "round": 2325,
          "averageReward": -0.026,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 16.275,
          "qStateCount": 109600
        },
        {
          "round": 2350,
          "averageReward": -0.186,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 14.775,
          "qStateCount": 110088
        },
        {
          "round": 2375,
          "averageReward": 0.104,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 18.275,
          "qStateCount": 110619
        },
        {
          "round": 2400,
          "averageReward": 0.004,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 19.95,
          "qStateCount": 111112
        },
        {
          "round": 2425,
          "averageReward": 0.261,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 25.325,
          "qStateCount": 111500
        },
        {
          "round": 2450,
          "averageReward": 0.759,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 39.95,
          "qStateCount": 111839
        },
        {
          "round": 2475,
          "averageReward": 0.491,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 32.15,
          "qStateCount": 112322
        },
        {
          "round": 2500,
          "averageReward": 0.157,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.275,
          "qStateCount": 112695
        },
        {
          "round": 2525,
          "averageReward": 0.054,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.4,
          "qStateCount": 113100
        },
        {
          "round": 2550,
          "averageReward": 0.319,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.225,
          "qStateCount": 113419
        },
        {
          "round": 2575,
          "averageReward": 0.54,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 31.9,
          "qStateCount": 113863
        },
        {
          "round": 2600,
          "averageReward": 0.45,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.2,
          "qStateCount": 114237
        },
        {
          "round": 2625,
          "averageReward": 0.211,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 14.075,
          "qStateCount": 114674
        },
        {
          "round": 2650,
          "averageReward": -0.282,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 9.3,
          "qStateCount": 115199
        },
        {
          "round": 2675,
          "averageReward": -0.19,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.7,
          "qStateCount": 115660
        },
        {
          "round": 2700,
          "averageReward": -0.192,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 16.825,
          "qStateCount": 116098
        },
        {
          "round": 2725,
          "averageReward": -0.299,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 9.325,
          "qStateCount": 116617
        },
        {
          "round": 2750,
          "averageReward": 0.216,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 29.3,
          "qStateCount": 116973
        },
        {
          "round": 2775,
          "averageReward": 0.452,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 31.65,
          "qStateCount": 117288
        },
        {
          "round": 2800,
          "averageReward": 0.247,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 20.9,
          "qStateCount": 117740
        },
        {
          "round": 2825,
          "averageReward": 0.121,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 17.625,
          "qStateCount": 118113
        },
        {
          "round": 2850,
          "averageReward": 0.126,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 23.275,
          "qStateCount": 118531
        },
        {
          "round": 2875,
          "averageReward": -0.006,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 18.15,
          "qStateCount": 119027
        },
        {
          "round": 2900,
          "averageReward": 0.236,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 21.05,
          "qStateCount": 119313
        },
        {
          "round": 2925,
          "averageReward": 0.371,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 21.175,
          "qStateCount": 119907
        },
        {
          "round": 2950,
          "averageReward": 0.108,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 13.7,
          "qStateCount": 120537
        },
        {
          "round": 2975,
          "averageReward": -0.063,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 13.725,
          "qStateCount": 121036
        },
        {
          "round": 3000,
          "averageReward": 0.176,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.85,
          "qStateCount": 121481
        },
        {
          "round": 3025,
          "averageReward": 0.446,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 28.9,
          "qStateCount": 121760
        },
        {
          "round": 3050,
          "averageReward": 0.253,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.4,
          "qStateCount": 122049
        },
        {
          "round": 3075,
          "averageReward": 0.262,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 18.925,
          "qStateCount": 122376
        },
        {
          "round": 3100,
          "averageReward": 0.119,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 14.875,
          "qStateCount": 122724
        },
        {
          "round": 3125,
          "averageReward": 0.591,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 25.825,
          "qStateCount": 123044
        },
        {
          "round": 3150,
          "averageReward": 0.379,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 20.575,
          "qStateCount": 123556
        },
        {
          "round": 3175,
          "averageReward": 0.231,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 19.8,
          "qStateCount": 124041
        },
        {
          "round": 3200,
          "averageReward": 0.485,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.625,
          "qStateCount": 124440
        },
        {
          "round": 3225,
          "averageReward": 0.121,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 13.75,
          "qStateCount": 124851
        },
        {
          "round": 3250,
          "averageReward": 0.23,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 20.775,
          "qStateCount": 125405
        },
        {
          "round": 3275,
          "averageReward": 0.379,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 32.95,
          "qStateCount": 125864
        },
        {
          "round": 3300,
          "averageReward": 0.501,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.4,
          "qStateCount": 126210
        },
        {
          "round": 3325,
          "averageReward": 0.306,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 19.75,
          "qStateCount": 126632
        },
        {
          "round": 3350,
          "averageReward": 0.447,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 26.15,
          "qStateCount": 127071
        },
        {
          "round": 3375,
          "averageReward": 0.248,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.675,
          "qStateCount": 127463
        },
        {
          "round": 3400,
          "averageReward": 0.206,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.35,
          "qStateCount": 128119
        },
        {
          "round": 3425,
          "averageReward": 0.697,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.325,
          "qStateCount": 128513
        },
        {
          "round": 3450,
          "averageReward": 0.927,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 33.9,
          "qStateCount": 128786
        },
        {
          "round": 3475,
          "averageReward": 0.067,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.75,
          "qStateCount": 129288
        },
        {
          "round": 3500,
          "averageReward": -0.062,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.2,
          "qStateCount": 129761
        },
        {
          "round": 3525,
          "averageReward": 0.314,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 24.5,
          "qStateCount": 130130
        },
        {
          "round": 3550,
          "averageReward": 0.412,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 23.975,
          "qStateCount": 130481
        },
        {
          "round": 3575,
          "averageReward": 0.418,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23,
          "qStateCount": 130823
        },
        {
          "round": 3600,
          "averageReward": 0.29,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.45,
          "qStateCount": 131258
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/bastion-expert.json"
  },
  {
    "profileId": "scavenger",
    "difficulty": "easy",
    "label": "Scavenger Easy",
    "summary": "Easy checkpoint trained against aggressor, anchor, scavenger scripted opponents.",
    "curriculum": [
      "aggressor",
      "anchor",
      "scavenger"
    ],
    "trainingRounds": 220,
    "qStateCount": 11749,
    "stats": {
      "rounds": 120,
      "botWins": 46,
      "playerWins": 41,
      "draws": 33,
      "botWinRate": 0.383
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.951,
          "averageBotWinRate": 0.56,
          "averageHealthDelta": 19.24,
          "qStateCount": 1764
        },
        {
          "round": 50,
          "averageReward": 1.3,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.4,
          "qStateCount": 3347
        },
        {
          "round": 75,
          "averageReward": 1.222,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.15,
          "qStateCount": 4803
        },
        {
          "round": 100,
          "averageReward": 1.13,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.55,
          "qStateCount": 6055
        },
        {
          "round": 125,
          "averageReward": 0.849,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 12.75,
          "qStateCount": 7289
        },
        {
          "round": 150,
          "averageReward": 0.76,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 14.025,
          "qStateCount": 8368
        },
        {
          "round": 175,
          "averageReward": 1.064,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.95,
          "qStateCount": 9511
        },
        {
          "round": 200,
          "averageReward": 1.148,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 30.75,
          "qStateCount": 10808
        },
        {
          "round": 220,
          "averageReward": 0.953,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.775,
          "qStateCount": 11749
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/scavenger-easy.json"
  },
  {
    "profileId": "scavenger",
    "difficulty": "medium",
    "label": "Scavenger Medium",
    "summary": "Medium checkpoint trained against aggressor, scavenger, sentinel, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "anchor"
    ],
    "trainingRounds": 700,
    "qStateCount": 32900,
    "stats": {
      "rounds": 160,
      "botWins": 96,
      "playerWins": 29,
      "draws": 35,
      "botWinRate": 0.6
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 1.292,
          "averageBotWinRate": 0.64,
          "averageHealthDelta": 37.56,
          "qStateCount": 12684
        },
        {
          "round": 50,
          "averageReward": 1.332,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 36.025,
          "qStateCount": 13733
        },
        {
          "round": 75,
          "averageReward": 1.043,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 28.85,
          "qStateCount": 14689
        },
        {
          "round": 100,
          "averageReward": 1.253,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 37.45,
          "qStateCount": 15714
        },
        {
          "round": 125,
          "averageReward": 1.453,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 40.4,
          "qStateCount": 16765
        },
        {
          "round": 150,
          "averageReward": 1.543,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 41.5,
          "qStateCount": 17758
        },
        {
          "round": 175,
          "averageReward": 1.311,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 43.525,
          "qStateCount": 18528
        },
        {
          "round": 200,
          "averageReward": 1.536,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 51.65,
          "qStateCount": 19269
        },
        {
          "round": 225,
          "averageReward": 1.183,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 33.45,
          "qStateCount": 19987
        },
        {
          "round": 250,
          "averageReward": 1.397,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 41.8,
          "qStateCount": 20886
        },
        {
          "round": 275,
          "averageReward": 1.814,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 48.85,
          "qStateCount": 21617
        },
        {
          "round": 300,
          "averageReward": 1.423,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 35.275,
          "qStateCount": 22315
        },
        {
          "round": 325,
          "averageReward": 1.443,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 38.3,
          "qStateCount": 23150
        },
        {
          "round": 350,
          "averageReward": 1.607,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 44.05,
          "qStateCount": 23804
        },
        {
          "round": 375,
          "averageReward": 1.563,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 45.6,
          "qStateCount": 24522
        },
        {
          "round": 400,
          "averageReward": 1.845,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 56.8,
          "qStateCount": 25176
        },
        {
          "round": 425,
          "averageReward": 1.783,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 51.75,
          "qStateCount": 25855
        },
        {
          "round": 450,
          "averageReward": 1.588,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 43.575,
          "qStateCount": 26616
        },
        {
          "round": 475,
          "averageReward": 1.499,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 35.2,
          "qStateCount": 27413
        },
        {
          "round": 500,
          "averageReward": 1.392,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 39.05,
          "qStateCount": 27990
        },
        {
          "round": 525,
          "averageReward": 1.316,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 37.55,
          "qStateCount": 28741
        },
        {
          "round": 550,
          "averageReward": 1.541,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 46.125,
          "qStateCount": 29387
        },
        {
          "round": 575,
          "averageReward": 1.367,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 45.8,
          "qStateCount": 29941
        },
        {
          "round": 600,
          "averageReward": 1.776,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 53.175,
          "qStateCount": 30525
        },
        {
          "round": 625,
          "averageReward": 1.739,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 51.675,
          "qStateCount": 31116
        },
        {
          "round": 650,
          "averageReward": 1.591,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 52.075,
          "qStateCount": 31729
        },
        {
          "round": 675,
          "averageReward": 1.573,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 53.8,
          "qStateCount": 32253
        },
        {
          "round": 700,
          "averageReward": 1.801,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 56.45,
          "qStateCount": 32900
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/scavenger-medium.json"
  },
  {
    "profileId": "scavenger",
    "difficulty": "hard",
    "label": "Scavenger Hard",
    "summary": "Hard checkpoint trained against aggressor, scavenger, sentinel, flanker, anchor, duelist scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "anchor",
      "duelist"
    ],
    "trainingRounds": 1800,
    "qStateCount": 99463,
    "stats": {
      "rounds": 220,
      "botWins": 104,
      "playerWins": 71,
      "draws": 45,
      "botWinRate": 0.473
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.909,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.4,
          "qStateCount": 34095
        },
        {
          "round": 50,
          "averageReward": 1.044,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 32.325,
          "qStateCount": 35111
        },
        {
          "round": 75,
          "averageReward": 1.321,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 29.8,
          "qStateCount": 36293
        },
        {
          "round": 100,
          "averageReward": 1.313,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 37.725,
          "qStateCount": 37338
        },
        {
          "round": 125,
          "averageReward": 1.353,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 41.025,
          "qStateCount": 38561
        },
        {
          "round": 150,
          "averageReward": 1.306,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 41.65,
          "qStateCount": 39721
        },
        {
          "round": 175,
          "averageReward": 1.002,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 27.725,
          "qStateCount": 40839
        },
        {
          "round": 200,
          "averageReward": 0.982,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 26.125,
          "qStateCount": 41847
        },
        {
          "round": 225,
          "averageReward": 1.026,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 35.6,
          "qStateCount": 42654
        },
        {
          "round": 250,
          "averageReward": 1.051,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 32.625,
          "qStateCount": 43886
        },
        {
          "round": 275,
          "averageReward": 1.039,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.575,
          "qStateCount": 45060
        },
        {
          "round": 300,
          "averageReward": 0.776,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 19.575,
          "qStateCount": 46094
        },
        {
          "round": 325,
          "averageReward": 0.811,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.85,
          "qStateCount": 47000
        },
        {
          "round": 350,
          "averageReward": 1.05,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 37.175,
          "qStateCount": 48047
        },
        {
          "round": 375,
          "averageReward": 1.143,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 36.725,
          "qStateCount": 49016
        },
        {
          "round": 400,
          "averageReward": 1.153,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 32.575,
          "qStateCount": 50092
        },
        {
          "round": 425,
          "averageReward": 0.816,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 26.975,
          "qStateCount": 51111
        },
        {
          "round": 450,
          "averageReward": 1.162,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 33.925,
          "qStateCount": 52151
        },
        {
          "round": 475,
          "averageReward": 0.992,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.325,
          "qStateCount": 52979
        },
        {
          "round": 500,
          "averageReward": 0.991,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 34.475,
          "qStateCount": 53952
        },
        {
          "round": 525,
          "averageReward": 1.103,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 33.15,
          "qStateCount": 55044
        },
        {
          "round": 550,
          "averageReward": 1.342,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 41.55,
          "qStateCount": 56263
        },
        {
          "round": 575,
          "averageReward": 1.311,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 36.75,
          "qStateCount": 57420
        },
        {
          "round": 600,
          "averageReward": 1.002,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 25.225,
          "qStateCount": 58334
        },
        {
          "round": 625,
          "averageReward": 1.032,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.45,
          "qStateCount": 59243
        },
        {
          "round": 650,
          "averageReward": 1.159,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 37.25,
          "qStateCount": 60360
        },
        {
          "round": 675,
          "averageReward": 1.071,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 32,
          "qStateCount": 61175
        },
        {
          "round": 700,
          "averageReward": 0.794,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 29.05,
          "qStateCount": 62187
        },
        {
          "round": 725,
          "averageReward": 0.874,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.325,
          "qStateCount": 63039
        },
        {
          "round": 750,
          "averageReward": 0.709,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 20.275,
          "qStateCount": 64125
        },
        {
          "round": 775,
          "averageReward": 0.538,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.7,
          "qStateCount": 64850
        },
        {
          "round": 800,
          "averageReward": 0.729,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.5,
          "qStateCount": 65819
        },
        {
          "round": 825,
          "averageReward": 0.686,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.9,
          "qStateCount": 66789
        },
        {
          "round": 850,
          "averageReward": 0.852,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 26.15,
          "qStateCount": 67580
        },
        {
          "round": 875,
          "averageReward": 1.047,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 33.8,
          "qStateCount": 68513
        },
        {
          "round": 900,
          "averageReward": 1.008,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 27.825,
          "qStateCount": 69372
        },
        {
          "round": 925,
          "averageReward": 0.728,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 23.5,
          "qStateCount": 70231
        },
        {
          "round": 950,
          "averageReward": 0.845,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 26.875,
          "qStateCount": 71165
        },
        {
          "round": 975,
          "averageReward": 1.207,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 39.575,
          "qStateCount": 71970
        },
        {
          "round": 1000,
          "averageReward": 0.781,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 26.85,
          "qStateCount": 73246
        },
        {
          "round": 1025,
          "averageReward": 0.584,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 12.425,
          "qStateCount": 74177
        },
        {
          "round": 1050,
          "averageReward": 0.229,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 7.775,
          "qStateCount": 75427
        },
        {
          "round": 1075,
          "averageReward": 0.481,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.625,
          "qStateCount": 76138
        },
        {
          "round": 1100,
          "averageReward": 0.918,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 38.675,
          "qStateCount": 77132
        },
        {
          "round": 1125,
          "averageReward": 0.86,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.425,
          "qStateCount": 78015
        },
        {
          "round": 1150,
          "averageReward": 0.583,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.875,
          "qStateCount": 78908
        },
        {
          "round": 1175,
          "averageReward": 0.916,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.75,
          "qStateCount": 79469
        },
        {
          "round": 1200,
          "averageReward": 1.054,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.925,
          "qStateCount": 80357
        },
        {
          "round": 1225,
          "averageReward": 0.956,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 26.075,
          "qStateCount": 81107
        },
        {
          "round": 1250,
          "averageReward": 0.885,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 25.825,
          "qStateCount": 82108
        },
        {
          "round": 1275,
          "averageReward": 0.769,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 21.925,
          "qStateCount": 83117
        },
        {
          "round": 1300,
          "averageReward": 0.743,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 25.75,
          "qStateCount": 83953
        },
        {
          "round": 1325,
          "averageReward": 0.893,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 26.6,
          "qStateCount": 84939
        },
        {
          "round": 1350,
          "averageReward": 1.017,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 30.725,
          "qStateCount": 85628
        },
        {
          "round": 1375,
          "averageReward": 0.834,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.325,
          "qStateCount": 86518
        },
        {
          "round": 1400,
          "averageReward": 0.722,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 25.8,
          "qStateCount": 87374
        },
        {
          "round": 1425,
          "averageReward": 1.039,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 27.325,
          "qStateCount": 88233
        },
        {
          "round": 1450,
          "averageReward": 1.266,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 35.5,
          "qStateCount": 89028
        },
        {
          "round": 1475,
          "averageReward": 1.002,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 29.4,
          "qStateCount": 89776
        },
        {
          "round": 1500,
          "averageReward": 0.856,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.475,
          "qStateCount": 90568
        },
        {
          "round": 1525,
          "averageReward": 1.219,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 37.375,
          "qStateCount": 91150
        },
        {
          "round": 1550,
          "averageReward": 0.813,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 23.75,
          "qStateCount": 92075
        },
        {
          "round": 1575,
          "averageReward": 0.742,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.925,
          "qStateCount": 92923
        },
        {
          "round": 1600,
          "averageReward": 0.864,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.825,
          "qStateCount": 93665
        },
        {
          "round": 1625,
          "averageReward": 1.12,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 34.575,
          "qStateCount": 94428
        },
        {
          "round": 1650,
          "averageReward": 1.2,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 36.725,
          "qStateCount": 95296
        },
        {
          "round": 1675,
          "averageReward": 1.121,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 29.775,
          "qStateCount": 95897
        },
        {
          "round": 1700,
          "averageReward": 0.895,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 28.55,
          "qStateCount": 96462
        },
        {
          "round": 1725,
          "averageReward": 1.004,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 30.575,
          "qStateCount": 97195
        },
        {
          "round": 1750,
          "averageReward": 1.059,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 31.85,
          "qStateCount": 97959
        },
        {
          "round": 1775,
          "averageReward": 1.054,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 29.175,
          "qStateCount": 98897
        },
        {
          "round": 1800,
          "averageReward": 0.887,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.4,
          "qStateCount": 99463
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/scavenger-hard.json"
  },
  {
    "profileId": "scavenger",
    "difficulty": "expert",
    "label": "Scavenger Expert",
    "summary": "Expert checkpoint trained against aggressor, scavenger, sentinel, flanker, duelist, anchor, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "duelist",
      "anchor",
      "anchor"
    ],
    "trainingRounds": 3600,
    "qStateCount": 191847,
    "stats": {
      "rounds": 280,
      "botWins": 166,
      "playerWins": 73,
      "draws": 41,
      "botWinRate": 0.593
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 1.022,
          "averageBotWinRate": 0.56,
          "averageHealthDelta": 24.68,
          "qStateCount": 100109
        },
        {
          "round": 50,
          "averageReward": 0.988,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.85,
          "qStateCount": 100719
        },
        {
          "round": 75,
          "averageReward": 1.204,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 29.15,
          "qStateCount": 101193
        },
        {
          "round": 100,
          "averageReward": 1.198,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 23,
          "qStateCount": 101779
        },
        {
          "round": 125,
          "averageReward": 0.841,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 17.3,
          "qStateCount": 102483
        },
        {
          "round": 150,
          "averageReward": 1.085,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 29.55,
          "qStateCount": 103111
        },
        {
          "round": 175,
          "averageReward": 1.241,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 30.275,
          "qStateCount": 103746
        },
        {
          "round": 200,
          "averageReward": 1.112,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.975,
          "qStateCount": 104626
        },
        {
          "round": 225,
          "averageReward": 1.01,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 19.75,
          "qStateCount": 105300
        },
        {
          "round": 250,
          "averageReward": 0.753,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.25,
          "qStateCount": 105991
        },
        {
          "round": 275,
          "averageReward": 0.874,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 23.025,
          "qStateCount": 106661
        },
        {
          "round": 300,
          "averageReward": 1.058,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 30.1,
          "qStateCount": 107499
        },
        {
          "round": 325,
          "averageReward": 1.595,
          "averageBotWinRate": 0.775,
          "averageHealthDelta": 49.8,
          "qStateCount": 108305
        },
        {
          "round": 350,
          "averageReward": 1.448,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 37.875,
          "qStateCount": 109009
        },
        {
          "round": 375,
          "averageReward": 1.398,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 39.825,
          "qStateCount": 109695
        },
        {
          "round": 400,
          "averageReward": 1.097,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 36.375,
          "qStateCount": 110482
        },
        {
          "round": 425,
          "averageReward": 1.219,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 35.6,
          "qStateCount": 111067
        },
        {
          "round": 450,
          "averageReward": 0.992,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 30.6,
          "qStateCount": 111710
        },
        {
          "round": 475,
          "averageReward": 1.242,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 38.7,
          "qStateCount": 112482
        },
        {
          "round": 500,
          "averageReward": 1.576,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 44.525,
          "qStateCount": 112992
        },
        {
          "round": 525,
          "averageReward": 1.299,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 37.2,
          "qStateCount": 113896
        },
        {
          "round": 550,
          "averageReward": 1.3,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.925,
          "qStateCount": 114300
        },
        {
          "round": 575,
          "averageReward": 1.224,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 32.725,
          "qStateCount": 115000
        },
        {
          "round": 600,
          "averageReward": 1.076,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.15,
          "qStateCount": 115640
        },
        {
          "round": 625,
          "averageReward": 0.993,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 27.525,
          "qStateCount": 116330
        },
        {
          "round": 650,
          "averageReward": 0.666,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 24.7,
          "qStateCount": 117078
        },
        {
          "round": 675,
          "averageReward": 0.927,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 26.325,
          "qStateCount": 117715
        },
        {
          "round": 700,
          "averageReward": 1.178,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.85,
          "qStateCount": 118455
        },
        {
          "round": 725,
          "averageReward": 1.196,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 27.975,
          "qStateCount": 119018
        },
        {
          "round": 750,
          "averageReward": 1.104,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 24.85,
          "qStateCount": 119781
        },
        {
          "round": 775,
          "averageReward": 0.975,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 26.2,
          "qStateCount": 120473
        },
        {
          "round": 800,
          "averageReward": 0.931,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.875,
          "qStateCount": 121138
        },
        {
          "round": 825,
          "averageReward": 1.062,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 32.775,
          "qStateCount": 122151
        },
        {
          "round": 850,
          "averageReward": 0.926,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.625,
          "qStateCount": 122763
        },
        {
          "round": 875,
          "averageReward": 0.882,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.65,
          "qStateCount": 123764
        },
        {
          "round": 900,
          "averageReward": 1.005,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.325,
          "qStateCount": 124367
        },
        {
          "round": 925,
          "averageReward": 1.174,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 31.55,
          "qStateCount": 125006
        },
        {
          "round": 950,
          "averageReward": 0.9,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.65,
          "qStateCount": 125930
        },
        {
          "round": 975,
          "averageReward": 1.008,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 30.725,
          "qStateCount": 126686
        },
        {
          "round": 1000,
          "averageReward": 1.022,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 29.475,
          "qStateCount": 127402
        },
        {
          "round": 1025,
          "averageReward": 0.701,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.875,
          "qStateCount": 128041
        },
        {
          "round": 1050,
          "averageReward": 0.861,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.5,
          "qStateCount": 128750
        },
        {
          "round": 1075,
          "averageReward": 1.04,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.8,
          "qStateCount": 129338
        },
        {
          "round": 1100,
          "averageReward": 0.875,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.375,
          "qStateCount": 129945
        },
        {
          "round": 1125,
          "averageReward": 1.107,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 34.45,
          "qStateCount": 130755
        },
        {
          "round": 1150,
          "averageReward": 1.004,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 31.55,
          "qStateCount": 131333
        },
        {
          "round": 1175,
          "averageReward": 1.109,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.975,
          "qStateCount": 132035
        },
        {
          "round": 1200,
          "averageReward": 0.949,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.35,
          "qStateCount": 132600
        },
        {
          "round": 1225,
          "averageReward": 1.421,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 36.05,
          "qStateCount": 133238
        },
        {
          "round": 1250,
          "averageReward": 1.566,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 38.9,
          "qStateCount": 133862
        },
        {
          "round": 1275,
          "averageReward": 1.241,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 29.175,
          "qStateCount": 134479
        },
        {
          "round": 1300,
          "averageReward": 0.992,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 22.65,
          "qStateCount": 135230
        },
        {
          "round": 1325,
          "averageReward": 0.762,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 21.65,
          "qStateCount": 135917
        },
        {
          "round": 1350,
          "averageReward": 1.057,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 34.125,
          "qStateCount": 136595
        },
        {
          "round": 1375,
          "averageReward": 1.085,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.55,
          "qStateCount": 137291
        },
        {
          "round": 1400,
          "averageReward": 1.053,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 21.9,
          "qStateCount": 138140
        },
        {
          "round": 1425,
          "averageReward": 0.991,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 26.275,
          "qStateCount": 138810
        },
        {
          "round": 1450,
          "averageReward": 1.034,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 22.525,
          "qStateCount": 139415
        },
        {
          "round": 1475,
          "averageReward": 1.084,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 25.925,
          "qStateCount": 140074
        },
        {
          "round": 1500,
          "averageReward": 1.572,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 37.075,
          "qStateCount": 140675
        },
        {
          "round": 1525,
          "averageReward": 1.462,
          "averageBotWinRate": 0.75,
          "averageHealthDelta": 42.4,
          "qStateCount": 141469
        },
        {
          "round": 1550,
          "averageReward": 1.243,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 30.55,
          "qStateCount": 142025
        },
        {
          "round": 1575,
          "averageReward": 0.926,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 19,
          "qStateCount": 142574
        },
        {
          "round": 1600,
          "averageReward": 0.883,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 19.875,
          "qStateCount": 143065
        },
        {
          "round": 1625,
          "averageReward": 0.475,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 12.425,
          "qStateCount": 143921
        },
        {
          "round": 1650,
          "averageReward": 0.48,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 8.7,
          "qStateCount": 144549
        },
        {
          "round": 1675,
          "averageReward": 0.653,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 11.875,
          "qStateCount": 145285
        },
        {
          "round": 1700,
          "averageReward": 1.047,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 27.95,
          "qStateCount": 146002
        },
        {
          "round": 1725,
          "averageReward": 0.871,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 16.075,
          "qStateCount": 146744
        },
        {
          "round": 1750,
          "averageReward": 0.844,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 16.825,
          "qStateCount": 147689
        },
        {
          "round": 1775,
          "averageReward": 0.704,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 21.975,
          "qStateCount": 148281
        },
        {
          "round": 1800,
          "averageReward": 0.671,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 23.275,
          "qStateCount": 148924
        },
        {
          "round": 1825,
          "averageReward": 0.809,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 30.025,
          "qStateCount": 149587
        },
        {
          "round": 1850,
          "averageReward": 1.225,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 41.875,
          "qStateCount": 150374
        },
        {
          "round": 1875,
          "averageReward": 1.266,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 42.225,
          "qStateCount": 150958
        },
        {
          "round": 1900,
          "averageReward": 0.947,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.675,
          "qStateCount": 151505
        },
        {
          "round": 1925,
          "averageReward": 0.997,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 30.8,
          "qStateCount": 152094
        },
        {
          "round": 1950,
          "averageReward": 1.169,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 31.35,
          "qStateCount": 152596
        },
        {
          "round": 1975,
          "averageReward": 1.034,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 19.775,
          "qStateCount": 153189
        },
        {
          "round": 2000,
          "averageReward": 0.875,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.575,
          "qStateCount": 153826
        },
        {
          "round": 2025,
          "averageReward": 0.834,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 28.325,
          "qStateCount": 154599
        },
        {
          "round": 2050,
          "averageReward": 0.906,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 24.725,
          "qStateCount": 155517
        },
        {
          "round": 2075,
          "averageReward": 1.084,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 25.375,
          "qStateCount": 155870
        },
        {
          "round": 2100,
          "averageReward": 1.309,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 30.225,
          "qStateCount": 156662
        },
        {
          "round": 2125,
          "averageReward": 0.787,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 19.9,
          "qStateCount": 157251
        },
        {
          "round": 2150,
          "averageReward": 0.928,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 17.525,
          "qStateCount": 157817
        },
        {
          "round": 2175,
          "averageReward": 0.971,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 16.35,
          "qStateCount": 158495
        },
        {
          "round": 2200,
          "averageReward": 1.099,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 23.35,
          "qStateCount": 158929
        },
        {
          "round": 2225,
          "averageReward": 0.923,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 21.275,
          "qStateCount": 159595
        },
        {
          "round": 2250,
          "averageReward": 1.16,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 29.375,
          "qStateCount": 160082
        },
        {
          "round": 2275,
          "averageReward": 1.043,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 26.425,
          "qStateCount": 160854
        },
        {
          "round": 2300,
          "averageReward": 1.119,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 25.9,
          "qStateCount": 161562
        },
        {
          "round": 2325,
          "averageReward": 1.133,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 30.6,
          "qStateCount": 161982
        },
        {
          "round": 2350,
          "averageReward": 1.145,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 29.85,
          "qStateCount": 162473
        },
        {
          "round": 2375,
          "averageReward": 0.917,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 24.15,
          "qStateCount": 162978
        },
        {
          "round": 2400,
          "averageReward": 1.151,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 25.925,
          "qStateCount": 163584
        },
        {
          "round": 2425,
          "averageReward": 1.357,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 30.95,
          "qStateCount": 164282
        },
        {
          "round": 2450,
          "averageReward": 1.485,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 39.9,
          "qStateCount": 165066
        },
        {
          "round": 2475,
          "averageReward": 1.265,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 35.525,
          "qStateCount": 165698
        },
        {
          "round": 2500,
          "averageReward": 0.95,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 32.425,
          "qStateCount": 166450
        },
        {
          "round": 2525,
          "averageReward": 0.902,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 24.125,
          "qStateCount": 166971
        },
        {
          "round": 2550,
          "averageReward": 0.572,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 12.475,
          "qStateCount": 167698
        },
        {
          "round": 2575,
          "averageReward": 0.541,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 15.3,
          "qStateCount": 168325
        },
        {
          "round": 2600,
          "averageReward": 1.11,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 30.6,
          "qStateCount": 168742
        },
        {
          "round": 2625,
          "averageReward": 1.063,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 30.025,
          "qStateCount": 169543
        },
        {
          "round": 2650,
          "averageReward": 0.797,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 16.75,
          "qStateCount": 170285
        },
        {
          "round": 2675,
          "averageReward": 0.863,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 23.7,
          "qStateCount": 170926
        },
        {
          "round": 2700,
          "averageReward": 0.797,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.9,
          "qStateCount": 171360
        },
        {
          "round": 2725,
          "averageReward": 0.738,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 26.875,
          "qStateCount": 171828
        },
        {
          "round": 2750,
          "averageReward": 1.104,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 34.25,
          "qStateCount": 172228
        },
        {
          "round": 2775,
          "averageReward": 1.214,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 34.4,
          "qStateCount": 172888
        },
        {
          "round": 2800,
          "averageReward": 1.031,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 27.525,
          "qStateCount": 173529
        },
        {
          "round": 2825,
          "averageReward": 0.708,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.475,
          "qStateCount": 174073
        },
        {
          "round": 2850,
          "averageReward": 0.713,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 18.9,
          "qStateCount": 174632
        },
        {
          "round": 2875,
          "averageReward": 1.13,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 32.275,
          "qStateCount": 175356
        },
        {
          "round": 2900,
          "averageReward": 1.079,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 22.775,
          "qStateCount": 175799
        },
        {
          "round": 2925,
          "averageReward": 1.056,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 30.9,
          "qStateCount": 176267
        },
        {
          "round": 2950,
          "averageReward": 1.058,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 32.525,
          "qStateCount": 176929
        },
        {
          "round": 2975,
          "averageReward": 1.205,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 31.725,
          "qStateCount": 177552
        },
        {
          "round": 3000,
          "averageReward": 1.22,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 34.175,
          "qStateCount": 177948
        },
        {
          "round": 3025,
          "averageReward": 0.67,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 12.875,
          "qStateCount": 178493
        },
        {
          "round": 3050,
          "averageReward": 0.825,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 23.625,
          "qStateCount": 179119
        },
        {
          "round": 3075,
          "averageReward": 0.902,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.925,
          "qStateCount": 179711
        },
        {
          "round": 3100,
          "averageReward": 0.908,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.95,
          "qStateCount": 180268
        },
        {
          "round": 3125,
          "averageReward": 1.061,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 32.2,
          "qStateCount": 180943
        },
        {
          "round": 3150,
          "averageReward": 1.087,
          "averageBotWinRate": 0.725,
          "averageHealthDelta": 37.95,
          "qStateCount": 181680
        },
        {
          "round": 3175,
          "averageReward": 1.071,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 22.625,
          "qStateCount": 182048
        },
        {
          "round": 3200,
          "averageReward": 0.815,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 17.3,
          "qStateCount": 182473
        },
        {
          "round": 3225,
          "averageReward": 0.776,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 14.55,
          "qStateCount": 183186
        },
        {
          "round": 3250,
          "averageReward": 0.506,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 13.125,
          "qStateCount": 183869
        },
        {
          "round": 3275,
          "averageReward": 0.718,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.375,
          "qStateCount": 184302
        },
        {
          "round": 3300,
          "averageReward": 0.934,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 19.525,
          "qStateCount": 184828
        },
        {
          "round": 3325,
          "averageReward": 0.997,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.325,
          "qStateCount": 185435
        },
        {
          "round": 3350,
          "averageReward": 1.018,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 31.05,
          "qStateCount": 186042
        },
        {
          "round": 3375,
          "averageReward": 0.744,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 27.525,
          "qStateCount": 186699
        },
        {
          "round": 3400,
          "averageReward": 0.729,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 17.6,
          "qStateCount": 187155
        },
        {
          "round": 3425,
          "averageReward": 0.573,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 7.85,
          "qStateCount": 187712
        },
        {
          "round": 3450,
          "averageReward": 0.943,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 21.725,
          "qStateCount": 188314
        },
        {
          "round": 3475,
          "averageReward": 0.999,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 25.075,
          "qStateCount": 188907
        },
        {
          "round": 3500,
          "averageReward": 0.938,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 22.6,
          "qStateCount": 189388
        },
        {
          "round": 3525,
          "averageReward": 0.865,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 19.975,
          "qStateCount": 189903
        },
        {
          "round": 3550,
          "averageReward": 0.734,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 17.2,
          "qStateCount": 190501
        },
        {
          "round": 3575,
          "averageReward": 0.786,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 33.325,
          "qStateCount": 191091
        },
        {
          "round": 3600,
          "averageReward": 1.199,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 42.2,
          "qStateCount": 191847
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/scavenger-expert.json"
  },
  {
    "profileId": "stalker",
    "difficulty": "easy",
    "label": "Stalker Easy",
    "summary": "Easy checkpoint trained against aggressor, anchor, scavenger scripted opponents.",
    "curriculum": [
      "aggressor",
      "anchor",
      "scavenger"
    ],
    "trainingRounds": 220,
    "qStateCount": 4422,
    "stats": {
      "rounds": 120,
      "botWins": 63,
      "playerWins": 56,
      "draws": 1,
      "botWinRate": 0.525
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.294,
          "averageBotWinRate": 0.64,
          "averageHealthDelta": 13.28,
          "qStateCount": 727
        },
        {
          "round": 50,
          "averageReward": -0.083,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": -4.75,
          "qStateCount": 1343
        },
        {
          "round": 75,
          "averageReward": -0.159,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": -8.15,
          "qStateCount": 1889
        },
        {
          "round": 100,
          "averageReward": -0.01,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": -3.4,
          "qStateCount": 2318
        },
        {
          "round": 125,
          "averageReward": 0.314,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 3.475,
          "qStateCount": 2733
        },
        {
          "round": 150,
          "averageReward": 0.104,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": -6.125,
          "qStateCount": 3332
        },
        {
          "round": 175,
          "averageReward": 0.14,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": -3.2,
          "qStateCount": 3690
        },
        {
          "round": 200,
          "averageReward": 0.361,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 8.05,
          "qStateCount": 4101
        },
        {
          "round": 220,
          "averageReward": 0.225,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": -0.925,
          "qStateCount": 4422
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/stalker-easy.json"
  },
  {
    "profileId": "stalker",
    "difficulty": "medium",
    "label": "Stalker Medium",
    "summary": "Medium checkpoint trained against aggressor, scavenger, sentinel, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "anchor"
    ],
    "trainingRounds": 700,
    "qStateCount": 12994,
    "stats": {
      "rounds": 160,
      "botWins": 85,
      "playerWins": 72,
      "draws": 3,
      "botWinRate": 0.531
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.813,
          "averageBotWinRate": 0.64,
          "averageHealthDelta": 24.92,
          "qStateCount": 4815
        },
        {
          "round": 50,
          "averageReward": 0.667,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 16.6,
          "qStateCount": 5251
        },
        {
          "round": 75,
          "averageReward": 0.343,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 12.35,
          "qStateCount": 5654
        },
        {
          "round": 100,
          "averageReward": 0.637,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 24.775,
          "qStateCount": 6003
        },
        {
          "round": 125,
          "averageReward": 0.877,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 25.8,
          "qStateCount": 6364
        },
        {
          "round": 150,
          "averageReward": 0.832,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 24.525,
          "qStateCount": 6735
        },
        {
          "round": 175,
          "averageReward": 0.507,
          "averageBotWinRate": 0.65,
          "averageHealthDelta": 18.725,
          "qStateCount": 7135
        },
        {
          "round": 200,
          "averageReward": 0.572,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 17.025,
          "qStateCount": 7418
        },
        {
          "round": 225,
          "averageReward": 0.768,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 19.125,
          "qStateCount": 7749
        },
        {
          "round": 250,
          "averageReward": 0.748,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 16.7,
          "qStateCount": 8100
        },
        {
          "round": 275,
          "averageReward": 0.655,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 15.6,
          "qStateCount": 8431
        },
        {
          "round": 300,
          "averageReward": 0.653,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 20.55,
          "qStateCount": 8727
        },
        {
          "round": 325,
          "averageReward": 0.836,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 23.4,
          "qStateCount": 9016
        },
        {
          "round": 350,
          "averageReward": 0.995,
          "averageBotWinRate": 0.675,
          "averageHealthDelta": 33.1,
          "qStateCount": 9298
        },
        {
          "round": 375,
          "averageReward": 1.211,
          "averageBotWinRate": 0.7,
          "averageHealthDelta": 35.95,
          "qStateCount": 9532
        },
        {
          "round": 400,
          "averageReward": 1.058,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 27.7,
          "qStateCount": 9752
        },
        {
          "round": 425,
          "averageReward": 0.846,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.175,
          "qStateCount": 10012
        },
        {
          "round": 450,
          "averageReward": 0.706,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 24.875,
          "qStateCount": 10368
        },
        {
          "round": 475,
          "averageReward": 0.769,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.225,
          "qStateCount": 10634
        },
        {
          "round": 500,
          "averageReward": 0.753,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 19.65,
          "qStateCount": 10856
        },
        {
          "round": 525,
          "averageReward": 0.832,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 18.9,
          "qStateCount": 11140
        },
        {
          "round": 550,
          "averageReward": 0.698,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 16.475,
          "qStateCount": 11400
        },
        {
          "round": 575,
          "averageReward": 0.899,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 24.475,
          "qStateCount": 11652
        },
        {
          "round": 600,
          "averageReward": 0.665,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 14.025,
          "qStateCount": 11956
        },
        {
          "round": 625,
          "averageReward": 0.605,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.275,
          "qStateCount": 12189
        },
        {
          "round": 650,
          "averageReward": 0.782,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 13.3,
          "qStateCount": 12527
        },
        {
          "round": 675,
          "averageReward": 0.806,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 16.125,
          "qStateCount": 12752
        },
        {
          "round": 700,
          "averageReward": 1.004,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 23.625,
          "qStateCount": 12994
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/stalker-medium.json"
  },
  {
    "profileId": "stalker",
    "difficulty": "hard",
    "label": "Stalker Hard",
    "summary": "Hard checkpoint trained against aggressor, scavenger, sentinel, flanker, anchor, duelist scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "anchor",
      "duelist"
    ],
    "trainingRounds": 1800,
    "qStateCount": 39678,
    "stats": {
      "rounds": 220,
      "botWins": 110,
      "playerWins": 102,
      "draws": 8,
      "botWinRate": 0.5
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": -0.285,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -6.92,
          "qStateCount": 13719
        },
        {
          "round": 50,
          "averageReward": -0.017,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -8.8,
          "qStateCount": 14203
        },
        {
          "round": 75,
          "averageReward": 0.214,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 5.025,
          "qStateCount": 14614
        },
        {
          "round": 100,
          "averageReward": 0.336,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.075,
          "qStateCount": 15187
        },
        {
          "round": 125,
          "averageReward": 0.381,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.725,
          "qStateCount": 15674
        },
        {
          "round": 150,
          "averageReward": 0.005,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -2.35,
          "qStateCount": 16187
        },
        {
          "round": 175,
          "averageReward": 0.13,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -3.425,
          "qStateCount": 16695
        },
        {
          "round": 200,
          "averageReward": 0.381,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 4.175,
          "qStateCount": 17037
        },
        {
          "round": 225,
          "averageReward": 0.485,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 12.975,
          "qStateCount": 17358
        },
        {
          "round": 250,
          "averageReward": 0.333,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 6.475,
          "qStateCount": 17936
        },
        {
          "round": 275,
          "averageReward": 0.381,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 5.675,
          "qStateCount": 18386
        },
        {
          "round": 300,
          "averageReward": 0.276,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 8.075,
          "qStateCount": 18928
        },
        {
          "round": 325,
          "averageReward": -0.189,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -12.025,
          "qStateCount": 19389
        },
        {
          "round": 350,
          "averageReward": 0.346,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 0.2,
          "qStateCount": 19813
        },
        {
          "round": 375,
          "averageReward": 0.414,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 4.5,
          "qStateCount": 20227
        },
        {
          "round": 400,
          "averageReward": 0.691,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 13.2,
          "qStateCount": 20730
        },
        {
          "round": 425,
          "averageReward": 0.581,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.325,
          "qStateCount": 21139
        },
        {
          "round": 450,
          "averageReward": 0.278,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 2.8,
          "qStateCount": 21528
        },
        {
          "round": 475,
          "averageReward": 0.41,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 5.2,
          "qStateCount": 21897
        },
        {
          "round": 500,
          "averageReward": 0.651,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 13.325,
          "qStateCount": 22209
        },
        {
          "round": 525,
          "averageReward": 0.775,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 21.825,
          "qStateCount": 22515
        },
        {
          "round": 550,
          "averageReward": 0.411,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 9.95,
          "qStateCount": 22943
        },
        {
          "round": 575,
          "averageReward": 0.552,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 12.75,
          "qStateCount": 23301
        },
        {
          "round": 600,
          "averageReward": 0.697,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 6.6,
          "qStateCount": 23640
        },
        {
          "round": 625,
          "averageReward": 0.268,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 1.15,
          "qStateCount": 24090
        },
        {
          "round": 650,
          "averageReward": 0.108,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": -2.825,
          "qStateCount": 24502
        },
        {
          "round": 675,
          "averageReward": 0.35,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 4.75,
          "qStateCount": 24841
        },
        {
          "round": 700,
          "averageReward": 0.446,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.55,
          "qStateCount": 25185
        },
        {
          "round": 725,
          "averageReward": 0.406,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 4.15,
          "qStateCount": 25618
        },
        {
          "round": 750,
          "averageReward": 0.111,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 1.275,
          "qStateCount": 26032
        },
        {
          "round": 775,
          "averageReward": 0.012,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -3.475,
          "qStateCount": 26461
        },
        {
          "round": 800,
          "averageReward": 0.354,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 1.4,
          "qStateCount": 26789
        },
        {
          "round": 825,
          "averageReward": 0.546,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 10.2,
          "qStateCount": 27070
        },
        {
          "round": 850,
          "averageReward": 0.115,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -0.525,
          "qStateCount": 27510
        },
        {
          "round": 875,
          "averageReward": -0.085,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": -11.525,
          "qStateCount": 27877
        },
        {
          "round": 900,
          "averageReward": 0.449,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 13.525,
          "qStateCount": 28208
        },
        {
          "round": 925,
          "averageReward": 0.419,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.85,
          "qStateCount": 28539
        },
        {
          "round": 950,
          "averageReward": 0.502,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 9.125,
          "qStateCount": 28844
        },
        {
          "round": 975,
          "averageReward": 0.54,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 11.675,
          "qStateCount": 29144
        },
        {
          "round": 1000,
          "averageReward": 0.314,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 6.725,
          "qStateCount": 29614
        },
        {
          "round": 1025,
          "averageReward": 0.637,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 8.15,
          "qStateCount": 29866
        },
        {
          "round": 1050,
          "averageReward": 0.303,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 2.575,
          "qStateCount": 30151
        },
        {
          "round": 1075,
          "averageReward": 0.122,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -2.1,
          "qStateCount": 30478
        },
        {
          "round": 1100,
          "averageReward": 0.497,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 8.9,
          "qStateCount": 30867
        },
        {
          "round": 1125,
          "averageReward": 0.521,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 10.9,
          "qStateCount": 31267
        },
        {
          "round": 1150,
          "averageReward": 0.037,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 4.475,
          "qStateCount": 31725
        },
        {
          "round": 1175,
          "averageReward": -0.132,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -6.325,
          "qStateCount": 32019
        },
        {
          "round": 1200,
          "averageReward": 0.12,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -0.8,
          "qStateCount": 32510
        },
        {
          "round": 1225,
          "averageReward": 0.138,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.25,
          "qStateCount": 32899
        },
        {
          "round": 1250,
          "averageReward": 0.336,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 4.65,
          "qStateCount": 33154
        },
        {
          "round": 1275,
          "averageReward": 0.185,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 3.825,
          "qStateCount": 33488
        },
        {
          "round": 1300,
          "averageReward": 0.323,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8.275,
          "qStateCount": 33817
        },
        {
          "round": 1325,
          "averageReward": 0.601,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 12.55,
          "qStateCount": 34092
        },
        {
          "round": 1350,
          "averageReward": 0.307,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 6.475,
          "qStateCount": 34373
        },
        {
          "round": 1375,
          "averageReward": 0.324,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.85,
          "qStateCount": 34619
        },
        {
          "round": 1400,
          "averageReward": 0.632,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 11.125,
          "qStateCount": 34872
        },
        {
          "round": 1425,
          "averageReward": 0.378,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 10.575,
          "qStateCount": 35194
        },
        {
          "round": 1450,
          "averageReward": 0.173,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 3.025,
          "qStateCount": 35465
        },
        {
          "round": 1475,
          "averageReward": 0.302,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 5.925,
          "qStateCount": 35796
        },
        {
          "round": 1500,
          "averageReward": 0.509,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 13.975,
          "qStateCount": 36111
        },
        {
          "round": 1525,
          "averageReward": 0.228,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 2.975,
          "qStateCount": 36334
        },
        {
          "round": 1550,
          "averageReward": 0.269,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 5.85,
          "qStateCount": 36711
        },
        {
          "round": 1575,
          "averageReward": 0.375,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 9.525,
          "qStateCount": 37063
        },
        {
          "round": 1600,
          "averageReward": 0.625,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 17.875,
          "qStateCount": 37297
        },
        {
          "round": 1625,
          "averageReward": 0.497,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.575,
          "qStateCount": 37664
        },
        {
          "round": 1650,
          "averageReward": 0.464,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8.425,
          "qStateCount": 37887
        },
        {
          "round": 1675,
          "averageReward": 0.557,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 9.825,
          "qStateCount": 38204
        },
        {
          "round": 1700,
          "averageReward": 0.755,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 16.775,
          "qStateCount": 38532
        },
        {
          "round": 1725,
          "averageReward": 0.762,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 17.3,
          "qStateCount": 38769
        },
        {
          "round": 1750,
          "averageReward": 0.68,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 14.075,
          "qStateCount": 39052
        },
        {
          "round": 1775,
          "averageReward": 0.578,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 13.475,
          "qStateCount": 39367
        },
        {
          "round": 1800,
          "averageReward": 0.426,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 14.15,
          "qStateCount": 39678
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/stalker-hard.json"
  },
  {
    "profileId": "stalker",
    "difficulty": "expert",
    "label": "Stalker Expert",
    "summary": "Expert checkpoint trained against aggressor, scavenger, sentinel, flanker, duelist, anchor, anchor scripted opponents.",
    "curriculum": [
      "aggressor",
      "scavenger",
      "sentinel",
      "flanker",
      "duelist",
      "anchor",
      "anchor"
    ],
    "trainingRounds": 3600,
    "qStateCount": 75770,
    "stats": {
      "rounds": 280,
      "botWins": 114,
      "playerWins": 155,
      "draws": 11,
      "botWinRate": 0.407
    },
    "telemetry": {
      "sampleEvery": 25,
      "rollingWindow": 40,
      "points": [
        {
          "round": 25,
          "averageReward": 0.774,
          "averageBotWinRate": 0.52,
          "averageHealthDelta": 17.04,
          "qStateCount": 39977
        },
        {
          "round": 50,
          "averageReward": 0.714,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 5.25,
          "qStateCount": 40153
        },
        {
          "round": 75,
          "averageReward": 0.274,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": -3.2,
          "qStateCount": 40645
        },
        {
          "round": 100,
          "averageReward": 0.224,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": -7.175,
          "qStateCount": 40995
        },
        {
          "round": 125,
          "averageReward": 0.715,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 6.8,
          "qStateCount": 41215
        },
        {
          "round": 150,
          "averageReward": 0.735,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 5.95,
          "qStateCount": 41488
        },
        {
          "round": 175,
          "averageReward": 0.785,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 13.15,
          "qStateCount": 41723
        },
        {
          "round": 200,
          "averageReward": 0.514,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -3.475,
          "qStateCount": 41993
        },
        {
          "round": 225,
          "averageReward": 0.478,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 1.9,
          "qStateCount": 42246
        },
        {
          "round": 250,
          "averageReward": 0.725,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 13.1,
          "qStateCount": 42580
        },
        {
          "round": 275,
          "averageReward": 0.579,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8,
          "qStateCount": 42823
        },
        {
          "round": 300,
          "averageReward": 0.189,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -6.775,
          "qStateCount": 43079
        },
        {
          "round": 325,
          "averageReward": 0.323,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -8.65,
          "qStateCount": 43315
        },
        {
          "round": 350,
          "averageReward": 0.213,
          "averageBotWinRate": 0.275,
          "averageHealthDelta": -9.325,
          "qStateCount": 43539
        },
        {
          "round": 375,
          "averageReward": 0.567,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -0.375,
          "qStateCount": 43896
        },
        {
          "round": 400,
          "averageReward": 0.737,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 0.225,
          "qStateCount": 44213
        },
        {
          "round": 425,
          "averageReward": 0.14,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -10.675,
          "qStateCount": 44606
        },
        {
          "round": 450,
          "averageReward": 0.412,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -5.375,
          "qStateCount": 44896
        },
        {
          "round": 475,
          "averageReward": 0.767,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 9.5,
          "qStateCount": 45115
        },
        {
          "round": 500,
          "averageReward": 0.648,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -1.875,
          "qStateCount": 45341
        },
        {
          "round": 525,
          "averageReward": 0.457,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -4.7,
          "qStateCount": 45652
        },
        {
          "round": 550,
          "averageReward": 0.3,
          "averageBotWinRate": 0.275,
          "averageHealthDelta": -3.45,
          "qStateCount": 45987
        },
        {
          "round": 575,
          "averageReward": 0.306,
          "averageBotWinRate": 0.225,
          "averageHealthDelta": -13.1,
          "qStateCount": 46216
        },
        {
          "round": 600,
          "averageReward": 0.36,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 1.275,
          "qStateCount": 46480
        },
        {
          "round": 625,
          "averageReward": 0.473,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 1.625,
          "qStateCount": 46770
        },
        {
          "round": 650,
          "averageReward": 0.539,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 6.4,
          "qStateCount": 47023
        },
        {
          "round": 675,
          "averageReward": 0.836,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 14.75,
          "qStateCount": 47214
        },
        {
          "round": 700,
          "averageReward": 0.666,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 7.975,
          "qStateCount": 47454
        },
        {
          "round": 725,
          "averageReward": 0.317,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -5.35,
          "qStateCount": 47712
        },
        {
          "round": 750,
          "averageReward": 0.493,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": -1.675,
          "qStateCount": 47991
        },
        {
          "round": 775,
          "averageReward": 0.401,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 3.35,
          "qStateCount": 48329
        },
        {
          "round": 800,
          "averageReward": 0.426,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 6.6,
          "qStateCount": 48602
        },
        {
          "round": 825,
          "averageReward": 0.564,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 4.925,
          "qStateCount": 48813
        },
        {
          "round": 850,
          "averageReward": 0.448,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 4.725,
          "qStateCount": 49119
        },
        {
          "round": 875,
          "averageReward": 0.42,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 5.15,
          "qStateCount": 49496
        },
        {
          "round": 900,
          "averageReward": 0.894,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 9.275,
          "qStateCount": 49752
        },
        {
          "round": 925,
          "averageReward": 0.685,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 0.275,
          "qStateCount": 49963
        },
        {
          "round": 950,
          "averageReward": 0.812,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 14.125,
          "qStateCount": 50230
        },
        {
          "round": 975,
          "averageReward": 0.816,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 6.6,
          "qStateCount": 50400
        },
        {
          "round": 1000,
          "averageReward": 0.186,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": -2.525,
          "qStateCount": 50714
        },
        {
          "round": 1025,
          "averageReward": 0.385,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 1.3,
          "qStateCount": 50957
        },
        {
          "round": 1050,
          "averageReward": 0.546,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": -1.075,
          "qStateCount": 51167
        },
        {
          "round": 1075,
          "averageReward": 0.828,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 3.825,
          "qStateCount": 51397
        },
        {
          "round": 1100,
          "averageReward": 0.681,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 4.925,
          "qStateCount": 51649
        },
        {
          "round": 1125,
          "averageReward": 0.73,
          "averageBotWinRate": 0.6,
          "averageHealthDelta": 18.9,
          "qStateCount": 51940
        },
        {
          "round": 1150,
          "averageReward": 0.611,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 5.05,
          "qStateCount": 52192
        },
        {
          "round": 1175,
          "averageReward": 0.823,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 7.75,
          "qStateCount": 52474
        },
        {
          "round": 1200,
          "averageReward": 0.705,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 3.3,
          "qStateCount": 52651
        },
        {
          "round": 1225,
          "averageReward": 0.547,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 7.875,
          "qStateCount": 52907
        },
        {
          "round": 1250,
          "averageReward": 0.74,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 11.45,
          "qStateCount": 53164
        },
        {
          "round": 1275,
          "averageReward": 0.479,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -1.725,
          "qStateCount": 53398
        },
        {
          "round": 1300,
          "averageReward": 0.711,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 12.95,
          "qStateCount": 53616
        },
        {
          "round": 1325,
          "averageReward": 0.777,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8.425,
          "qStateCount": 53835
        },
        {
          "round": 1350,
          "averageReward": 0.499,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 2.125,
          "qStateCount": 54185
        },
        {
          "round": 1375,
          "averageReward": 0.667,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 8.575,
          "qStateCount": 54411
        },
        {
          "round": 1400,
          "averageReward": 0.73,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 9.9,
          "qStateCount": 54629
        },
        {
          "round": 1425,
          "averageReward": 0.481,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 3.875,
          "qStateCount": 54910
        },
        {
          "round": 1450,
          "averageReward": 0.318,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": -8.275,
          "qStateCount": 55199
        },
        {
          "round": 1475,
          "averageReward": 0.548,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -3.15,
          "qStateCount": 55450
        },
        {
          "round": 1500,
          "averageReward": 0.472,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -3.875,
          "qStateCount": 55834
        },
        {
          "round": 1525,
          "averageReward": 0.599,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 6.925,
          "qStateCount": 56100
        },
        {
          "round": 1550,
          "averageReward": 0.632,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 0.775,
          "qStateCount": 56282
        },
        {
          "round": 1575,
          "averageReward": 0.405,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -0.55,
          "qStateCount": 56596
        },
        {
          "round": 1600,
          "averageReward": 0.306,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 2.7,
          "qStateCount": 56858
        },
        {
          "round": 1625,
          "averageReward": 0.365,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -5.4,
          "qStateCount": 57140
        },
        {
          "round": 1650,
          "averageReward": 0.284,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -4.325,
          "qStateCount": 57420
        },
        {
          "round": 1675,
          "averageReward": 0.701,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 0.675,
          "qStateCount": 57738
        },
        {
          "round": 1700,
          "averageReward": 0.81,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 4.125,
          "qStateCount": 57944
        },
        {
          "round": 1725,
          "averageReward": 0.485,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -2.05,
          "qStateCount": 58226
        },
        {
          "round": 1750,
          "averageReward": 0.198,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -3.925,
          "qStateCount": 58480
        },
        {
          "round": 1775,
          "averageReward": 0.318,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 1.1,
          "qStateCount": 58657
        },
        {
          "round": 1800,
          "averageReward": 0.443,
          "averageBotWinRate": 0.325,
          "averageHealthDelta": -3.75,
          "qStateCount": 58859
        },
        {
          "round": 1825,
          "averageReward": 0.424,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 0.025,
          "qStateCount": 59023
        },
        {
          "round": 1850,
          "averageReward": 0.631,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 6.575,
          "qStateCount": 59224
        },
        {
          "round": 1875,
          "averageReward": 0.497,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.75,
          "qStateCount": 59543
        },
        {
          "round": 1900,
          "averageReward": 0.746,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 5.775,
          "qStateCount": 59734
        },
        {
          "round": 1925,
          "averageReward": 0.725,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 7.85,
          "qStateCount": 59923
        },
        {
          "round": 1950,
          "averageReward": 0.719,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 9.125,
          "qStateCount": 60201
        },
        {
          "round": 1975,
          "averageReward": 0.388,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -7.15,
          "qStateCount": 60483
        },
        {
          "round": 2000,
          "averageReward": 0.691,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 3.5,
          "qStateCount": 60717
        },
        {
          "round": 2025,
          "averageReward": 0.593,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 5.7,
          "qStateCount": 60994
        },
        {
          "round": 2050,
          "averageReward": 0.784,
          "averageBotWinRate": 0.575,
          "averageHealthDelta": 10.925,
          "qStateCount": 61227
        },
        {
          "round": 2075,
          "averageReward": 0.74,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 7.575,
          "qStateCount": 61489
        },
        {
          "round": 2100,
          "averageReward": 0.582,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.2,
          "qStateCount": 61704
        },
        {
          "round": 2125,
          "averageReward": 0.596,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 0.3,
          "qStateCount": 62036
        },
        {
          "round": 2150,
          "averageReward": 0.493,
          "averageBotWinRate": 0.3,
          "averageHealthDelta": -5.025,
          "qStateCount": 62324
        },
        {
          "round": 2175,
          "averageReward": 0.892,
          "averageBotWinRate": 0.55,
          "averageHealthDelta": 15.55,
          "qStateCount": 62619
        },
        {
          "round": 2200,
          "averageReward": 0.977,
          "averageBotWinRate": 0.625,
          "averageHealthDelta": 16.8,
          "qStateCount": 62771
        },
        {
          "round": 2225,
          "averageReward": 0.697,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 2.45,
          "qStateCount": 63076
        },
        {
          "round": 2250,
          "averageReward": 0.995,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 10.775,
          "qStateCount": 63312
        },
        {
          "round": 2275,
          "averageReward": 0.668,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 6.825,
          "qStateCount": 63585
        },
        {
          "round": 2300,
          "averageReward": 0.638,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 4,
          "qStateCount": 63838
        },
        {
          "round": 2325,
          "averageReward": 0.641,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 0.375,
          "qStateCount": 64028
        },
        {
          "round": 2350,
          "averageReward": 0.522,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 2.475,
          "qStateCount": 64246
        },
        {
          "round": 2375,
          "averageReward": 0.638,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 3.675,
          "qStateCount": 64433
        },
        {
          "round": 2400,
          "averageReward": 0.817,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 10.8,
          "qStateCount": 64687
        },
        {
          "round": 2425,
          "averageReward": 0.793,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 10.2,
          "qStateCount": 64846
        },
        {
          "round": 2450,
          "averageReward": 0.57,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -0.825,
          "qStateCount": 65111
        },
        {
          "round": 2475,
          "averageReward": 0.423,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -4.125,
          "qStateCount": 65467
        },
        {
          "round": 2500,
          "averageReward": 0.542,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 0.875,
          "qStateCount": 65670
        },
        {
          "round": 2525,
          "averageReward": 0.667,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.775,
          "qStateCount": 65908
        },
        {
          "round": 2550,
          "averageReward": 0.82,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 8.775,
          "qStateCount": 66120
        },
        {
          "round": 2575,
          "averageReward": 0.737,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 6.45,
          "qStateCount": 66398
        },
        {
          "round": 2600,
          "averageReward": 0.815,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": 7.75,
          "qStateCount": 66587
        },
        {
          "round": 2625,
          "averageReward": 0.853,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 8.075,
          "qStateCount": 66846
        },
        {
          "round": 2650,
          "averageReward": 0.79,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 9.975,
          "qStateCount": 67028
        },
        {
          "round": 2675,
          "averageReward": 0.497,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -0.075,
          "qStateCount": 67301
        },
        {
          "round": 2700,
          "averageReward": 0.307,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -3.35,
          "qStateCount": 67574
        },
        {
          "round": 2725,
          "averageReward": 0.69,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 5.1,
          "qStateCount": 67862
        },
        {
          "round": 2750,
          "averageReward": 0.69,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 8.65,
          "qStateCount": 68075
        },
        {
          "round": 2775,
          "averageReward": 0.797,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 9.075,
          "qStateCount": 68272
        },
        {
          "round": 2800,
          "averageReward": 0.718,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 2.425,
          "qStateCount": 68444
        },
        {
          "round": 2825,
          "averageReward": 0.688,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 5.25,
          "qStateCount": 68668
        },
        {
          "round": 2850,
          "averageReward": 0.496,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": -7.25,
          "qStateCount": 68860
        },
        {
          "round": 2875,
          "averageReward": 0.492,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 1.7,
          "qStateCount": 69052
        },
        {
          "round": 2900,
          "averageReward": 0.469,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 3.05,
          "qStateCount": 69225
        },
        {
          "round": 2925,
          "averageReward": 0.513,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 6.175,
          "qStateCount": 69497
        },
        {
          "round": 2950,
          "averageReward": 0.757,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 5.35,
          "qStateCount": 69712
        },
        {
          "round": 2975,
          "averageReward": 0.892,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 7.075,
          "qStateCount": 70024
        },
        {
          "round": 3000,
          "averageReward": 0.834,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 14.275,
          "qStateCount": 70252
        },
        {
          "round": 3025,
          "averageReward": 0.575,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 4.6,
          "qStateCount": 70538
        },
        {
          "round": 3050,
          "averageReward": 0.604,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 7.2,
          "qStateCount": 70744
        },
        {
          "round": 3075,
          "averageReward": 0.812,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 10.475,
          "qStateCount": 70929
        },
        {
          "round": 3100,
          "averageReward": 0.988,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 13.25,
          "qStateCount": 71276
        },
        {
          "round": 3125,
          "averageReward": 0.998,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 15.4,
          "qStateCount": 71434
        },
        {
          "round": 3150,
          "averageReward": 0.735,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 5.225,
          "qStateCount": 71723
        },
        {
          "round": 3175,
          "averageReward": 0.924,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 13.275,
          "qStateCount": 71931
        },
        {
          "round": 3200,
          "averageReward": 0.73,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 10.525,
          "qStateCount": 72147
        },
        {
          "round": 3225,
          "averageReward": 0.566,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 4.45,
          "qStateCount": 72351
        },
        {
          "round": 3250,
          "averageReward": 0.661,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 2.825,
          "qStateCount": 72532
        },
        {
          "round": 3275,
          "averageReward": 0.827,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 8.325,
          "qStateCount": 72772
        },
        {
          "round": 3300,
          "averageReward": 1.112,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": 12.25,
          "qStateCount": 72908
        },
        {
          "round": 3325,
          "averageReward": 0.618,
          "averageBotWinRate": 0.375,
          "averageHealthDelta": -0.95,
          "qStateCount": 73098
        },
        {
          "round": 3350,
          "averageReward": 0.475,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 4.825,
          "qStateCount": 73356
        },
        {
          "round": 3375,
          "averageReward": 0.4,
          "averageBotWinRate": 0.45,
          "averageHealthDelta": -1,
          "qStateCount": 73679
        },
        {
          "round": 3400,
          "averageReward": 0.536,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 2.075,
          "qStateCount": 73950
        },
        {
          "round": 3425,
          "averageReward": 0.67,
          "averageBotWinRate": 0.35,
          "averageHealthDelta": 1.475,
          "qStateCount": 74170
        },
        {
          "round": 3450,
          "averageReward": 0.901,
          "averageBotWinRate": 0.5,
          "averageHealthDelta": 14.35,
          "qStateCount": 74399
        },
        {
          "round": 3475,
          "averageReward": 0.747,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 8.25,
          "qStateCount": 74592
        },
        {
          "round": 3500,
          "averageReward": 0.943,
          "averageBotWinRate": 0.475,
          "averageHealthDelta": 11.85,
          "qStateCount": 74836
        },
        {
          "round": 3525,
          "averageReward": 0.979,
          "averageBotWinRate": 0.525,
          "averageHealthDelta": 15.175,
          "qStateCount": 75031
        },
        {
          "round": 3550,
          "averageReward": 0.541,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": -7.125,
          "qStateCount": 75302
        },
        {
          "round": 3575,
          "averageReward": 0.474,
          "averageBotWinRate": 0.425,
          "averageHealthDelta": 1.325,
          "qStateCount": 75524
        },
        {
          "round": 3600,
          "averageReward": 0.747,
          "averageBotWinRate": 0.4,
          "averageHealthDelta": 3,
          "qStateCount": 75770
        }
      ]
    },
    "assetPath": "/adaptive-arena-checkpoints/stalker-expert.json"
  }
]
