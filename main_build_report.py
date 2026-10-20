# -*- coding: utf-8 -*-
import os
import shutil
from report_src.core import create_report_document
from report_src.front_matter import add_cover_page, add_preliminaries
from report_src.chapter1 import add_chapter_1
from report_src.chapter2_part1 import add_chapter_2_part1
from report_src.chapter2_part2 import add_chapter_2_part2
from report_src.chapter2_tables import add_chapter_2_tables
from report_src.chapter3_part1 import add_chapter_3_part1
from report_src.chapter3_testcases import add_chapter_3_testcases
from report_src.chapter4 import add_chapter_4

def build_complete_report():
    print("Bắt đầu khởi tạo tài liệu Báo cáo Chuyên đề tốt nghiệp...")
    doc = create_report_document()
    
    print("1. Đang tạo Trang bìa, Lời cảm ơn, Cam đoan, Danh mục từ viết tắt và Mục lục...")
    add_cover_page(doc)
    add_preliminaries(doc)
    
    print("2. Đang tạo CHƯƠNG 1: GIỚI THIỆU...")
    add_chapter_1(doc)
    
    print("3. Đang tạo CHƯƠNG 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG...")
    add_chapter_2_part1(doc)
    add_chapter_2_part2(doc)
    add_chapter_2_tables(doc)
    
    print("4. Đang tạo CHƯƠNG 3: KẾT QUẢ THỰC NGHIỆM VÀ ĐÁNH GIÁ...")
    add_chapter_3_part1(doc)
    add_chapter_3_testcases(doc)
    
    print("5. Đang tạo CHƯƠNG 4: KẾT LUẬN, HƯỚNG PHÁT TRIỂN, TÀI LIỆU THAM KHẢO & PHỤ LỤC...")
    add_chapter_4(doc)
    
    output_workspace = "Bao_Cao_Chuyen_De_Tot_Nghiep_TOEIC_Master_Platform.docx"
    output_downloads = r"C:\Users\truon\Downloads\Bao_Cao_Chuyen_De_Tot_Nghiep_TOEIC_Master_Platform.docx"
    
    doc.save(output_workspace)
    print(f"Đã lưu thành công tệp báo cáo tại: {output_workspace}")
    
    try:
        shutil.copyfile(output_workspace, output_downloads)
        print(f"Đã sao chép tệp báo cáo tới thư mục Downloads: {output_downloads}")
    except Exception as e:
        print(f"Không thể sao chép tới Downloads: {e}")

if __name__ == "__main__":
    build_complete_report()
