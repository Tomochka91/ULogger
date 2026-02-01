# mbox_counter_emulator.py
"""
Эмулятор счетчика для протокола mbox_counter.

Сценарий:
- backend запускает mbox_counter логгер на COM1
- этот скрипт запускается на COM3
- при получении корректного запроса (9 байт) на нужный serial_u16
  отвечает валидным пакетом и инкрементирует total_count

Подразумевается, что COM1 <-> COM3 связаны виртуальной парой (null-modem).
"""

from __future__ import annotations

import argparse
import time
from typing import Optional

import serial


PREAMBLE = 0x27
C_READ_REQ = 0x43  # запрос
C_READ_RESP = 0x08  # ответ (данные счетчиков)
POLY = 0xE5


def crc8_e5(data: bytes) -> int:
    """
    CRC из твоего описания:
    - crc=0
    - crc ^= byte
    - 8 раз: if crc&0x80: crc ^= 0xE5; crc <<= 1
    - return ~crc
    """
    crc = 0
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x80:
                crc ^= POLY
            crc = (crc << 1) & 0xFF
    return (~crc) & 0xFF


def build_read_request(serial_u16: int) -> bytes:
    """
    Запрос: 27 05 43 A(2 LE) hdr_crc 01 00 data_crc

    header = [L=0x05, C=0x43] + A(2)
    hdr_crc = crc8(header)
    data = 01 00
    data_crc = crc8(data)
    """
    a = int(serial_u16).to_bytes(2, "little", signed=False)
    header = bytes([0x05, C_READ_REQ]) + a
    hdr_crc = bytes([crc8_e5(header)])
    data = bytes([0x01, 0x00])
    data_crc = bytes([crc8_e5(data)])
    return bytes([PREAMBLE]) + header + hdr_crc + data + data_crc


def build_read_response(serial_u16: int, total_count: int, size_dir: int = 1, flags: int = 0x05) -> bytes:
    """
    Ответ: 27 L C A(2 LE) hdr_crc DATA(7) data_crc

    DATA:
      total_count (u32 LE) + size_dir (u16 LE) + flags (u8)

    L = 3 + len(DATA) = 10 (0x0A)
    """
    a = int(serial_u16).to_bytes(2, "little", signed=False)
    data = (
        int(total_count).to_bytes(4, "little", signed=False)
        + int(size_dir).to_bytes(2, "little", signed=False)
        + bytes([flags & 0xFF])
    )
    L = 3 + len(data)  # 0x0A
    header = bytes([L, C_READ_RESP]) + a
    hdr_crc = bytes([crc8_e5(header)])
    data_crc = bytes([crc8_e5(data)])
    return bytes([PREAMBLE]) + header + hdr_crc + data + data_crc


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", default="COM3", help="COM port for emulator (default: COM3)")
    ap.add_argument("--baudrate", type=int, default=9600)
    ap.add_argument("--timeout", type=float, default=0.2)
    ap.add_argument("--serial", type=lambda x: int(x, 0), default=0x1A78, help="device serial_u16 (e.g. 0x1A78)")
    ap.add_argument("--start", type=int, default=100, help="initial total_count (default: 100)")
    ap.add_argument("--step", type=int, default=1, help="increment per valid request (default: 1)")
    args = ap.parse_args()

    expected_req = build_read_request(args.serial)
    total = args.start
    requests_seen = 0

    print(f"[emu] starting on {args.port}, baud={args.baudrate}, serial=0x{args.serial:04X}")
    print(f"[emu] expected request: {expected_req.hex(' ')}")

    ser: Optional[serial.Serial] = None
    try:
        ser = serial.Serial(
            port=args.port,
            baudrate=args.baudrate,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=args.timeout,
        )

        buf = bytearray()
        while True:
            chunk = ser.read(64)
            if chunk:
                buf.extend(chunk)

            # запрос фиксированный: 9 байт, начинается с 0x27
            while len(buf) >= 9:
                try:
                    stx = buf.index(PREAMBLE)
                except ValueError:
                    buf.clear()
                    break

                if stx > 0:
                    del buf[:stx]

                if len(buf) < 9:
                    break

                req = bytes(buf[:9])
                del buf[:9]

                if req != expected_req:
                    # не наш запрос — игнорируем молча (чтобы не флудить)
                    continue

                requests_seen += 1
                total += args.step

                resp = build_read_response(args.serial, total, size_dir=1, flags=0x05)
                ser.write(resp)
                ser.flush()

                print(f"[emu] req#{requests_seen} OK -> total={total}, resp={resp.hex(' ')}")

            time.sleep(0.002)

    except KeyboardInterrupt:
        print("\n[emu] stopped by user")
        return 0
    finally:
        if ser is not None:
            try:
                ser.close()
            except Exception:
                pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
