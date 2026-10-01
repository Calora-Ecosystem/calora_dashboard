# API Token (Staging)

> Yangilangan: 2026-09-18

## Access Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOlsiVXNlciIsIk9wZXJhdG9yIiwiU3VwZXJBZG1pbiJdLCJkZXZpY2UtaWQiOiI1ODgiLCJ1c2VyLWlkIjoiMjUiLCJzZXNzaW9uLWlkIjoiZGRiY2U1NzgtN2NjNS00NDQ4LWIwYjYtYmFjODQ0NDY3MDA2IiwicGxhbiI6ImZyZWUiLCJleHAiOjE3ODk3NTU3MTksImlzcyI6InN0YWdpbmcuY2Fsb3JhLnV6IiwiYXVkIjoic3RhZ2luZy5jYWxvcmEudXoifQ.URijmFZkmCFGbG69QuDl8aoYjjBkiAlMqWX1my1pRrU
```

> ⚠️ Staging **access token faqat ~5 daqiqa** yashaydi. Ko'p hollarda saqlangani
> foydasiz — kerak bo'lsa quyidagi bilan qaytadan auth qiling.

## Refresh Token
```
6q8cfALObkjolAUnIplE4jSe5JHIt4YG89oGHXAZVZQ=
```

## Expire
- Refresh Token: 2026-09-25T23:16:59 (+05:00)

## Account
- user-id: 25
- role: ["User", "Operator", "SuperAdmin"]

## Auth qilish uchun (2 qadam)
1. **OTP so'rash** — `POST /auth/send-otp/email/0605AbMu@gmail.com`
   Staging'da javob `content.verificationCode` ni **to'g'ridan-to'g'ri** qaytaradi
   (email kutish shart emas).
2. **Sign in** — `POST /auth/sign-in/email/` bilan:
```json
{
  "email": "0605AbMu@gmail.com",
  "verificationCode": "<1-qadamdagi content.verificationCode>",
  "code": "777777",
  "deviceInfo": { "key": "claude-test-002", "name": "Claude CLI 2" }
}
```
Javob: `content.accessToken`, `content.refreshToken`, `content.refreshTokenExpireAt`.
