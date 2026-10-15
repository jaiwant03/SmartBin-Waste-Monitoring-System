import pymupdf
import os

pdf_path = "SmartBin_Project_Report.pdf"
doc = pymupdf.open(pdf_path)
print(f"Total Pages: {len(doc)}")

out_dir = "scratch/inspected_pages"
os.makedirs(out_dir, exist_ok=True)

# Render pages to PNG
for i in range(len(doc)):
    page = doc[i]
    pix = page.get_pixmap(dpi=150)
    pix.save(f"{out_dir}/page_{i+1:02d}.png")

checks = {
    1: ["SmartBin: IoT-Based Solid Waste Monitoring", "1. Aim and Problem Statement", "Page 1 of 14"],
    2: ["1.4 Real-World Municipal Waste Need", "2. Components and Tools", "ESP32 DevKit V1", "Page 2 of 14"],
    3: ["2.2 Software Tools", "3. Block Diagram and Flowchart", "3.1 System Architectural Block Diagram", "Page 3 of 14"],
    4: ["3.2 Microcontroller Firmware Execution Flowchart", "3.3 Mathematical Formulation", "Table", "Page 4 of 14"],
    5: ["4. Circuit Diagram and Pin Connections", "V_GPIO27", "3.33 V", "4.3 Overvoltage Protection", "Page 5 of 14"],
    6: ["5. Program Code and Firmware Logic", "5.1 Firmware Source Code", "measureDistance", "return samples[validSamples / 2];", "Page 6 of 14"],
    7: ["5.2 Firmware Source Code", "sendTelemetry", "void setup()", "void loop()", "Page 7 of 14"],
    8: ["5.3 Median Filtering Rationale", "5.4 Non-Blocking Timing Architecture", "5.5 Edge vs. Cloud Tier Classification", "Page 8 of 14"],
    9: ["5.6 Threshold Classification", "5.7 Distributed Edge vs. Cloud", "Page 9 of 14"],
    10: ["6. Simulation and IoT Cloud Output", "SERIAL MONITOR @ 115200 BAUD", "Figure 6.1", "Page 10 of 14"],
    11: ["6.4 Live Sensor Monitoring", "Figure 6.2", "6.5 Autonomous Simulation Lab", "Figure 6.3", "Page 11 of 14"],
    12: ["6.6 Multi-Channel Alert Management Center", "Figure 6.4", "6.7 ThingSpeak", "field2 >= 80", "Page 12 of 14"],
    13: ["7. Results and Testing", "7.1 Quantitative Experimental Test Cases", "7.2 System Latency", "7.3 Stale Node Watchdog", "Page 13 of 14"],
    14: ["8. Conclusion, Applications and Future Scope", "8.1 Technical Conclusion", "8.2 Real-World Municipal", "8.3 Future Technological", "Student / Author Signature", "Faculty / Evaluator Signature", "Grade & Comments", "Page 14 of 14"]
}

all_ok = True
for page_num in range(1, 15):
    page = doc[page_num - 1]
    text = page.get_text()
    rects = page.get_text("blocks")
    max_y = max([b[3] for b in rects]) if rects else 0
    print(f"Page {page_num:02d}: max text y={max_y:.1f} pt (Page height: {page.rect.height:.1f} pt)")
    if page_num in checks:
        for exp in checks[page_num]:
            if exp not in text:
                print(f"  [FAIL] Missing text on Page {page_num}: \"{exp}\"")
                all_ok = False
            else:
                print(f"  [PASS] Found: \"{exp}\"")

print(f"\nAll 14 Pages Verified: {all_ok}")
