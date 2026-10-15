import os
import pymupdf

def main():
    with open("SmartBin_Project_Report.html", "r", encoding="utf-8") as f:
        html = f.read()
    page_count = html.count('class="page"')
    print(f"HTML class='page' count: {page_count}")

    doc = pymupdf.open("SmartBin_Project_Report.pdf")
    print(f"PDF page count: {len(doc)}")
    for i in range(len(doc)):
        text = doc[i].get_text()
        first = text.split("\n")[0] if text else ""
        last = text.split("\n")[-2] if len(text.split("\n")) > 1 else ""
        print(f"Page {i+1}: length={len(text)} | Header: {first[:40]} | Footer: {last[:40]}")

if __name__ == "__main__":
    main()
