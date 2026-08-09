# LAUDATO QUEST

เว็บแอปพลิเคชันเกมมิฟิเคชัน เรื่อง พระสมณสาส์น *Laudato Si’* สำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 6

## โครงสร้างปัจจุบัน

- `index.html` — หน้า Login / Home / Mission Journey / Progress
- `styles.css` — Responsive UI สำหรับคอมพิวเตอร์ แท็บเล็ต และโทรศัพท์
- `app.js` — ระบบ 5 Missions, Eco Points, Levels, Badges, Unlocking และ Feedback

## 5 Missions

1. บ้านของเรากำลังเปลี่ยนไป — โลกคือบ้านส่วนรวม
2. ทุกสิ่งเชื่อมโยงกัน — ทุกสิ่งสัมพันธ์กัน
3. หยุดวงจรทิ้งขว้าง — วัฒนธรรมการทิ้งขว้าง
4. เปลี่ยนฉัน เปลี่ยนโลก — การกลับใจทางนิเวศวิทยา
5. Guardian Challenge — ความรับผิดชอบต่อบ้านส่วนรวม

## Gamification

- Mission / Quest
- Eco Points
- Levels
- Badges
- Unlocking
- Impact Feedback

## ระดับ

- Eco Explorer — 0+
- Eco Learner — 100+
- Eco Thinker — 200+
- Eco Changemaker — 300+
- Guardian of Our Common Home — 400+

## ฐานข้อมูล Google Sheet

Spreadsheet ID:

`1TiopIT7NAMZ0wvXs20f7tCCGp74U_bH4Bn_peJjNadM`

แท็บที่เตรียมไว้:

- Dashboard
- Students
- Missions
- LearningContent
- QuestionBank
- Progress
- Responses
- Reflections
- Badges
- Settings

> เวอร์ชันปัจจุบันเก็บสถานะการทดลองเล่นไว้ใน `localStorage` ของเบราว์เซอร์ เพื่อให้หน้าเว็บเล่นได้ทันทีโดยไม่ต้องมี Backend ก่อน

## ขั้นเชื่อม Google Apps Script

ควรสร้าง Apps Script Web App เป็น API กลางระหว่าง GitHub Pages กับ Google Sheet โดยมี endpoints/operations เช่น:

- login / registerStudent
- getGameConfig
- getMissions
- getQuestions
- saveResponse
- saveMissionProgress
- saveReflection
- getStudentProgress

ไม่ควรเปิด Google Sheet ให้หน้าเว็บเขียนตรงจาก client-side JavaScript

## งานวิจัย

Eco Points ในเกมเป็นคะแนนสำหรับ gamification และความก้าวหน้าเท่านั้น ควรแยกออกจากคะแนนแบบวัดจิตสำนึกรับผิดชอบต่อสิ่งแวดล้อมก่อน–หลังการทดลอง
