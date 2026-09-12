import assert from "node:assert/strict";
import test from "node:test";
import { createOtpDeliveryCallback, type OtpDelivery } from "../../src/auth/otpDelivery.js";

const delivery: OtpDelivery = {
  email: "user@example.com",
  otp: "123456",
  type: "sign-in",
};

test("OTP delivery records success without exposing provider details", async () => {
  const recorded: Array<{ delivery: OtpDelivery; success: boolean }> = [];
  const callback = createOtpDeliveryCallback(
    async () => ({
      success: true,
      status: "sent",
      messageId: "provider-message-id",
      attempts: 1,
    }),
    async (input, result) => {
      recorded.push({ delivery: input, success: result.success });
    },
  );

  assert.equal(await callback(delivery), undefined);
  assert.deepEqual(recorded, [{ delivery, success: true }]);
});

test("OTP delivery records failure and rejects authentication delivery", async () => {
  let recorded = false;
  const callback = createOtpDeliveryCallback(
    async () => ({
      success: false,
      status: "failed",
      error: "provider unavailable",
      attempts: 3,
    }),
    async () => {
      recorded = true;
    },
  );

  await assert.rejects(() => callback(delivery), /OTP delivery failed/);
  assert.equal(recorded, true);
});
