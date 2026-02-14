import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("Child growth API", () => {
  it("creates child with required sex", async () => {
    const instance = await createApp();
    const response = await instance.inject({
      method: "POST",
      url: "/children",
      payload: {
        name: "민준",
        birthDate: "2023-05-03",
        sex: "M"
      }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.sex).toBe("M");
    await instance.close();
  });

  it("blocks duplicated checkup date per child", async () => {
    const instance = await createApp();

    const childRes = await instance.inject({
      method: "POST",
      url: "/children",
      payload: {
        name: "서윤",
        birthDate: "2022-09-01",
        sex: "F"
      }
    });
    const child = childRes.json();

    const payload = {
      checkupDate: "2024-09-01",
      heightCm: 90,
      weightKg: 12,
      source: "manual"
    };

    const first = await instance.inject({
      method: "POST",
      url: `/children/${child.id}/checkups`,
      payload
    });

    const second = await instance.inject({
      method: "POST",
      url: `/children/${child.id}/checkups`,
      payload
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    await instance.close();
  });

  it("rejects abnormal unit ranges", async () => {
    const instance = await createApp();

    const childRes = await instance.inject({
      method: "POST",
      url: "/children",
      payload: {
        name: "지우",
        birthDate: "2023-01-01",
        sex: "F"
      }
    });
    const child = childRes.json();

    const response = await instance.inject({
      method: "POST",
      url: `/children/${child.id}/checkups`,
      payload: {
        checkupDate: "2024-03-01",
        heightCm: 15,
        weightKg: 0.4,
        source: "manual"
      }
    });

    expect(response.statusCode).toBe(400);
    await instance.close();
  });

  it("returns insufficient_data prediction with too few records", async () => {
    const instance = await createApp();

    const childRes = await instance.inject({
      method: "POST",
      url: "/children",
      payload: {
        name: "하준",
        birthDate: "2021-01-01",
        sex: "M"
      }
    });

    const child = childRes.json();
    await instance.inject({
      method: "POST",
      url: `/children/${child.id}/checkups`,
      payload: {
        checkupDate: "2022-01-01",
        heightCm: 75,
        weightKg: 9,
        source: "manual"
      }
    });

    const response = await instance.inject({
      method: "GET",
      url: `/children/${child.id}/prediction`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().prediction.status).toBe("insufficient_data");
    await instance.close();
  });

  it("parses OCR text and returns warnings for missing fields", async () => {
    const instance = await createApp();

    const childRes = await instance.inject({
      method: "POST",
      url: "/children",
      payload: {
        name: "예준",
        birthDate: "2022-06-01",
        sex: "M"
      }
    });

    const child = childRes.json();

    const response = await instance.inject({
      method: "POST",
      url: `/children/${child.id}/checkups/ocr-parse`,
      payload: {
        text: "키: 86.4"
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.heightCm).toBe(86.4);
    expect(body.weightKg).toBeUndefined();
    expect(body.warnings.length).toBeGreaterThan(0);
    await instance.close();
  });
});
