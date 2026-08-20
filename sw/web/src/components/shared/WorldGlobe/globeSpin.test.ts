import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canStartFocusAnimation,
  hasInterruptedFocusTicket,
} from "./globeSpin";
import {
  GLOBE_ASPECT_RATIO,
  GLOBE_MIN_HEIGHT,
  globeFrameStyle,
  globeHeightForWidth,
} from "./globeLayout";

describe("globe layout", () => {
  it("uses one responsive height formula from mobile through atlas mode", () => {
    assert.equal(globeHeightForWidth(240, 460), 280);
    assert.equal(globeHeightForWidth(390, 460), 351);
    assert.equal(globeHeightForWidth(440, 460), 396);
    assert.equal(globeHeightForWidth(800, 460), 460);
    assert.equal(globeHeightForWidth(550, 620), 495);
  });

  it("reserves the same geometry before the canvas is drawn", () => {
    assert.deepEqual(globeFrameStyle(460), {
      width: "100%",
      aspectRatio: GLOBE_ASPECT_RATIO,
      minHeight: GLOBE_MIN_HEIGHT,
      maxHeight: 460,
    });
  });
});

describe("canStartFocusAnimation", () => {
  it("does not start an initial focus animation while the globe is offscreen", () => {
    assert.equal(
      canStartFocusAnimation(true, "event-1", false, "event-1#0", ""),
      false,
    );
  });

  it("starts the latest focus once the globe enters the viewport", () => {
    assert.equal(
      canStartFocusAnimation(true, "event-2", true, "event-2#1", "event-1#0"),
      true,
    );
    assert.equal(
      canStartFocusAnimation(true, "event-2", true, "event-2#1", "event-2#1"),
      false,
    );
  });

  it("requires a ready globe and a focus target", () => {
    assert.equal(
      canStartFocusAnimation(false, "event-1", true, "event-1#0", ""),
      false,
    );
    assert.equal(canStartFocusAnimation(true, null, true, "#0", ""), false);
  });
});

describe("hasInterruptedFocusTicket", () => {
  it("resets when the visibility effect runs before the queued frame", () => {
    assert.equal(hasInterruptedFocusTicket(false, "event-1#0"), true);

    let completedTicket = "event-1#0";
    let activeTicket: string | null = "event-1#0";
    if (hasInterruptedFocusTicket(false, activeTicket)) {
      completedTicket = "";
      activeTicket = null;
    }
    assert.equal(
      canStartFocusAnimation(true, "event-1", true, "event-1#0", completedTicket),
      true,
    );
    assert.equal(activeTicket, null);
  });

  it("resets when the queued frame aborts before the visibility effect", () => {
    let activeTicket: string | null = "event-1#0";
    let completedTicket = activeTicket;

    // The frame has already cleared its spinning/pulse flags, but the
    // active ticket remains until the visibility effect gets its turn.
    assert.equal(hasInterruptedFocusTicket(false, activeTicket), true);
    completedTicket = "";
    activeTicket = null;

    assert.equal(
      canStartFocusAnimation(true, "event-1", true, "event-1#0", completedTicket),
      true,
    );
    assert.equal(completedTicket, "");
    assert.equal(activeTicket, null);
  });

  it("does not reset a completed focus while the globe is visible", () => {
    assert.equal(hasInterruptedFocusTicket(true, "event-1#0"), false);
  });

  it("does not replay a focus that was cancelled by user input", () => {
    const completedTicket = "event-1#0";
    const activeTicket: string | null = null;

    // Pointer-down/reset paths clear only the active animation marker and
    // intentionally keep the completed ticket.
    assert.equal(hasInterruptedFocusTicket(false, activeTicket), false);
    assert.equal(
      canStartFocusAnimation(
        true,
        "event-1",
        true,
        "event-1#0",
        completedTicket,
      ),
      false,
    );
  });
});
