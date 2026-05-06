---
name: Staging API — Backend xatti-harakatlari
description: Staging API dagi muhim backend logikasi va kutilgan xatti-harakatlar
type: project
---

## DELETE /users/{userId}

- Faqat o'z accountini o'chirish mumkin — boshqa userId uchun `403 Forbidden`
- O'chirilgan email bilan qayta sign-in qilinsa **yangi account yaratiladi** (`hasNewUser: true`)
- Yangi account faqat `"User"` roli bilan boshlanadi — SuperAdmin qo'lda beriladi
- Bu **to'g'ri va mo'ljallangan** xatti-harakat

## Auth — Sign In

- `DeviceInfo.key` va `DeviceInfo.name` majburiy maydonlar
- `code: "777777"` — staging uchun o'zgarmas OTP kodi
- `hasNewUser: true` — yangi account yaratilganda qaytadi
