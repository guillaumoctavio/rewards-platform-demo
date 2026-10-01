jest.mock('../src/db');

const db = require('../src/db');
const { handleMessage } = require('../src/consumer');

function kafkaMessage(payload) {
  return { message: { value: Buffer.from(JSON.stringify(payload)) } };
}

describe('handleMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delivers a reward on reward.issued', async () => {
    await handleMessage(
      kafkaMessage({ type: 'reward.issued', purchaseId: 1, customerId: 'c1', rewardType: 'cashback_5pct' })
    );

    expect(db.insertDelivery).toHaveBeenCalledWith({
      purchaseId: 1,
      customerId: 'c1',
      rewardType: 'cashback_5pct',
    });
  });

  it('ignores reward.denied', async () => {
    await handleMessage(kafkaMessage({ type: 'reward.denied', purchaseId: 1, customerId: 'c1' }));

    expect(db.insertDelivery).not.toHaveBeenCalled();
  });

  it('skips an unparseable message without throwing', async () => {
    await expect(
      handleMessage({ message: { value: Buffer.from('not json') } })
    ).resolves.toBeUndefined();

    expect(db.insertDelivery).not.toHaveBeenCalled();
  });
});
