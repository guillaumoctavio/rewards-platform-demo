const { isEligible } = require('../src/rules');

describe('isEligible', () => {
  it('is eligible when amount is greater than 50', () => {
    expect(isEligible(51)).toBe(true);
  });

  it('is not eligible when amount is 50 or less', () => {
    expect(isEligible(50)).toBe(false);
    expect(isEligible(10)).toBe(false);
  });
});
