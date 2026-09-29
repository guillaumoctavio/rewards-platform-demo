jest.mock('../src/db');
jest.mock('../src/producer');

const db = require('../src/db');
const producer = require('../src/producer');
const { handleMessage } = require('../src/consumer');

function purchaseCreatedMessage(amount) {
  return {
    message: {
      value: Buffer.from(
        JSON.stringify({ type: 'purchase.created', purchaseId: 1, customerId: 'c1', amount })
      ),
    },
  };
}

describe('handleMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('issues a reward for an eligible purchase', async () => {
    await handleMessage(purchaseCreatedMessage(80));

    expect(db.insertReward).toHaveBeenCalledWith({
      purchaseId: 1,
      customerId: 'c1',
      rewardType: 'cashback_5pct',
      status: 'issued',
    });
    expect(producer.sendRewardEvent).toHaveBeenCalledWith({
      type: 'reward.issued',
      purchaseId: 1,
      customerId: 'c1',
      rewardType: 'cashback_5pct',
    });
  });

  it('denies a reward for a non-eligible purchase', async () => {
    await handleMessage(purchaseCreatedMessage(10));

    expect(db.insertReward).toHaveBeenCalledWith({
      purchaseId: 1,
      customerId: 'c1',
      rewardType: null,
      status: 'denied',
    });
    expect(producer.sendRewardEvent).toHaveBeenCalledWith({
      type: 'reward.denied',
      purchaseId: 1,
      customerId: 'c1',
      rewardType: null,
    });
  });

  it('ignores other event types', async () => {
    await handleMessage({ message: { value: Buffer.from(JSON.stringify({ type: 'other' })) } });

    expect(db.insertReward).not.toHaveBeenCalled();
    expect(producer.sendRewardEvent).not.toHaveBeenCalled();
  });
});
