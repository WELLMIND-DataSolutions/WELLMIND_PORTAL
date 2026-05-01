from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Body, Request
from pydantic import BaseModel
from typing import List, Optional
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime
import os

app = FastAPI()

# 1. CORS Settings (Aik hi dafa kafi hai)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(base_dir, "serviceAccountKey.json")

print(f"🔍 Looking for JSON at: {json_path}") # Debugging ke liye

if not firebase_admin._apps:
    try:
        if os.path.exists(json_path):
            cred = credentials.Certificate(json_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase App Initialized Successfully")
        else:
            print("❌ JSON File NOT FOUND at this path!")
    except Exception as e:
        print(f"❌ Initialization Error: {e}")

# CRITICAL: 'db' ko IF se bahar nikal dein taake ye hamesha available ho
try:
    db = firestore.client()
    print("✅ Firestore Client Ready!")
except Exception as e:
    print(f"❌ Firestore Client Error: {e}")
    db = None # Taake crash na ho balkay error show kare

# 3. Data Models
class AuthData(BaseModel):
    email: str
    password: str

class Employee(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str
    rank: str
    type: str
    avatar: Optional[str] = None
    avatarColor: str = ''
    profilePic: Optional[str] = None 
    location: str
    status: str = "Active"
    performance: int = 80
    avatarColor: str = "#3b82f6"

class Attendance(BaseModel):
    user_id: str
    status: str
    date: str = datetime.now().strftime("%Y-%m-%d")

class Achievement(BaseModel):
    user_id: str
    title: str
    description: str
    is_unlocked: bool = False
    unlocked_at: Optional[str] = None

# --- AUTH ENDPOINTS ---
@app.post("/signup")
async def signup(data: AuthData):
    try:
        user = auth.create_user(email=data.email, password=data.password)
        return {"message": "User created", "uid": user.uid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(data: AuthData):
    try:
        user = auth.get_user_by_email(data.email)
        return {"status": "success", "uid": user.uid, "email": user.email}
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")

# --- 5. DASHBOARD & PROJECT STATS ---
@app.get("/dashboard-stats")
async def get_dashboard_stats():
    try:
        # Projects ki poori list le kar aana zaroori hai widgets ke liye
        all_projects = []
        proj_ref = db.collection("projects").stream()
        for d in proj_ref:
            p = d.to_dict()
            p['id'] = d.id
            all_projects.append(p)

        # Baaki stats (jo aap pehle use kar rahe thay)
        total_emp = len(list(db.collection("employees").stream()))
        total_int = len(list(db.collection("interns").stream()))
        
        return {
            "total_team": total_emp + total_int,
            "active_projects": len([p for p in all_projects if p.get('status') == 'active' or p.get('status') == 'in-progress']),
            "projects_list": all_projects # Yeh line sabse zaroori hai
        }
    except Exception as e:
        return {"error": str(e)}
    
    
@app.get("/dashboard-details")
async def get_dashboard_details():
    try:
        # 1. Upcoming Deadlines (Jo projects 'active' hain aur deadline aane wali hai)
        projects_ref = db.collection("projects").where("status", "in", ["active", "in-progress"]).stream()
        upcoming = []
        for doc in projects_ref:
            p = doc.to_dict()
            upcoming.append({
                "id": doc.id,
                "projectName": p.get("projectName", "Untitled"),
                "deadline": p.get("deadline", ""),
                "personName": p.get("personName", "Unassigned")
            })
        # Deadline ke mutabiq sort karein
        upcoming = sorted(upcoming, key=lambda x: x['deadline'])[:5] 

        # 2. Recent Activity (Completed projects ko activity ke taur par dikhayein)
        activity_ref = db.collection("projects").where("status", "==", "completed").order_by("completedAt", direction=firestore.Query.DESCENDING).limit(5).stream()
        recent_activity = []
        for doc in activity_ref:
            p = doc.to_dict()
            recent_activity.append({
                "message": f"{p.get('personName')} completed {p.get('projectName')}",
                "time": p.get("completedAt", "Recently")
            })

        # 3. Available Team (Jo 'Active' hain lekin unka koi project 'active' nahi hai)
        # Note: Ye logic simple hai, aap isse complex bhi kar sakte hain
        team_ref = db.collection("employees").where("status", "==", "Active").limit(5).stream()
        available_team = []
        for doc in team_ref:
            t = doc.to_dict()
            available_team.append({
                "name": t.get("name"),
                "role": t.get("role"),
                "avatarColor": t.get("avatarColor", "#3b82f6")
            })

        return {
            "upcoming_deadlines": upcoming,
            "recent_activity": recent_activity,
            "available_team": available_team
        }
    except Exception as e:
        print(f"Dashboard Detail Error: {e}")
        return {"upcoming_deadlines": [], "recent_activity": [], "available_team": []}

# --- 6. EMPLOYEES ROUTES ---
@app.get("/employees")
async def get_employees():
    try:
        employees_ref = db.collection("employees").stream()
        result = []
        for doc in employees_ref:
            emp = doc.to_dict()
            emp_name = emp.get("name", "Unknown")
            
            # Projects Count from 'projects' collection
            completed_docs = db.collection("projects") \
                .where("personName", "==", emp_name) \
                .where("status", "==", "completed") \
                .stream()
            
            p_val = len(list(completed_docs))
            perf_val = min(100, 80 + (p_val * 2))

            result.append({
                "id": doc.id,
                "name": emp_name,
                "email": emp.get("email", ""),
                "phone": str(emp.get("phone", "—")),
                "education": str(emp.get("education", "—")),
                "institute": str(emp.get("institute", "—")),
                "role": emp.get("role", ""),
                 "avatar": str(emp.get("avatar", "")),          # ← ADD KARO
    "avatarColor": str(emp.get("avatarColor", "#8b5cf6")),
    "profilePic": str(emp.get("profilePic", "")),
                "department": emp.get("department", ""),
                "status": emp.get("status", "Active"),
                "projects": p_val,
                "performance": perf_val,
                "skills": emp.get("skills", []),
                "checkInTime": emp.get("checkInTime", "09:00 AM")
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/employees")
async def add_employee(req: Request):
    body = await req.json()
    _, doc_ref = db.collection("employees").add({**body, "createdAt": datetime.now()})
    return {"id": doc_ref.id}
# DELETE /employees/{id}
@app.delete("/employees/{emp_id}")
async def delete_employee(emp_id: str):
    try:
        doc_ref = db.collection("employees").document(emp_id)
        doc_ref.delete()
        return {"message": "Employee deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Root Route (Testing ke liye)
@app.get("/")
def read_root():
    return {"status": "Backend is running!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)

# --- ATTENDANCE ENDPOINTS ---
@app.post("/attendance/mark")
async def mark_attendance(att: Attendance):
    try:
        doc_id = f"{att.user_id}_{att.date}"
        db.collection("attendance").document(doc_id).set(att.dict())
        return {"message": f"Attendance marked for {att.date}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance/{user_id}")
async def get_user_attendance(user_id: str):
    try:
        docs = db.collection("attendance").where("user_id", "==", user_id).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ACHIEVEMENTS ENDPOINTS ---
@app.get("/achievements/{user_id}")
async def get_user_achievements(user_id: str):
    try:
        docs = db.collection("achievements").where("user_id", "==", user_id).stream()
        return [{**doc.to_dict(), "id": doc.id} for doc in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/achievements/unlock")
async def unlock_achievement(achievement: Achievement):
    try:
        achievement_data = achievement.dict()
        achievement_data["unlocked_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        achievement_data["is_unlocked"] = True
        ref = db.collection("achievements").add(achievement_data)
        return {"status": "success", "achievement_id": ref[1].id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SERVER START ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
# ============================================================
# --- INTERNS ENDPOINTS (SAME ROOTS LOGIC AS EMPLOYEES) ---
# ============================================================



# --- Interns ke Routes ---

# GET /interns (Redirect Logic)
@app.get("/interns")
async def get_interns_redirect():
    return await get_interns_list()

# GET /interns/list (Main Fetch Logic)
# GET /interns/list (Main Fetch Logic)
@app.get("/interns/list")
async def get_interns_list():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    try:
        interns_ref = db.collection("interns").stream()
        result = []
        
        for doc in interns_ref:
            try:
                item = doc.to_dict()
                if item is None: continue

                # --- DYNAMIC PROJECT COUNT LOGIC START ---
                intern_name = item.get("name", "")
                
                # 'projects' collection mein check karein ke is intern ne kitne task complete kiye
                completed_docs = db.collection("projects") \
                    .where("personName", "==", intern_name) \
                    .where("status", "==", "completed") \
                    .stream()
                
                # Ginti (Count) calculate karein
                p_val = len(list(completed_docs))
                
                # Performance calculation (80 base + har project pe 2 points)
                perf_val = 80 + (p_val * 2)
                if perf_val > 100: perf_val = 100
                # --- DYNAMIC PROJECT COUNT LOGIC END ---

                result.append({
                    "id": doc.id,
                    "name": str(item.get("name", "Unknown")),
                    "email": str(item.get("email", "")),
                    "phone": str(item.get("phone", "—")),
                    "type": str(item.get("type", "Intern")),
                     "education": str(item.get("education", "—")),
                    "institute": str(item.get("institute", "—")),
                    
                    "role": str(item.get("role", "")),
                    "rank": str(item.get("rank", "Intern")),
                    "department": str(item.get("department", "")),
                    "location": str(item.get("location", "Remote")),
                    "status": str(item.get("status", "Active")),
                        "avatar": str(item.get("avatar", "")),              # ← ADD KARO
    "avatarColor": str(item.get("avatarColor", "#8b5cf6")),
    "profilePic": str(item.get("profilePic", "")), 
                    
                    # Ab ye calculated values use hongi
                    "projects": p_val,
                    "performance": perf_val,
                    
                    "skills": list(item.get("skills")) if item.get("skills") is not None else [],
                    "leaveDays": item.get("leaveDays", 0) if item.get("leaveDays") is not None else 0,
                    "checkInTime": str(item.get("checkInTime", "09:00 AM")),
                    "checkOutTime": str(item.get("checkOutTime", "05:30 PM")),
                })
            except Exception as doc_err:
                print(f"Error parsing intern document {doc.id}: {doc_err}")
                continue
        
        return result
    except Exception as e:
        print(f"CRITICAL Interns Fetch Error: {e}")
        raise HTTPException(status_code=500, detail="Database Connection Error")
# POST /interns (Add Intern)
@app.post("/interns")
async def add_intern(req: Request):
    try:
        body = await req.json()
        
        # Validation
        if not body.get("name") or not body.get("email"):
            raise HTTPException(status_code=400, detail="Name and Email are required")

        # Firestore safe data structure
        intern_data = {
            "name": str(body.get("name", "")),
            "email": str(body.get("email", "")),
            "phone": str(body.get("phone", "")),
            "type": str(body.get("type", "Intern")),
            "role": str(body.get("role", "")),
            "rank": str(body.get("rank", "Intern")),
            "department": str(body.get("department", "")),
            "location": str(body.get("location", "Remote")),
            "status": str(body.get("status", "Active")),
           
             "avatar": str(body.get("avatar", "")),          # ← ADD KARO
    "avatarColor": str(body.get("avatarColor", "#8b5cf6")),
    "profilePic": str(body.get("profilePic", "")),
            "performance": int(body.get("performance", 0)),
            "projects": int(body.get("projects", 0)),
            "skills": list(body.get("skills", [])),
            "checkInTime": str(body.get("checkInTime", "09:00 AM")),
            "checkOutTime": str(body.get("checkOutTime", "05:30 PM")),
            "createdAt": datetime.now()
        }

        # Save to 'interns' collection
        _, doc_ref = db.collection("interns").add(intern_data)
        
        return {"message": "Success", "id": doc_ref.id}

    except Exception as e:
        print(f"❌ Error while adding intern: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# DELETE /interns/{id}
@app.delete("/interns/{intern_id}")
async def delete_intern(intern_id: str):
    try:
        doc_ref = db.collection("interns").document(intern_id)
        doc_ref.delete()
        return {"message": "Intern deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# --- Attendance Routes ---

# 1. Post Attendance (Check-in/out save karne ke liye)
@app.post("/attendance")
async def mark_attendance(req: Request):
    try:
        body = await req.json()
        
        # Validation
        if not body.get("empId") or not body.get("status"):
            raise HTTPException(status_code=400, detail="Employee ID and Status are required")

        attendance_data = {
            "empId": body.get("empId"),
            "name": body.get("name"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "checkIn": body.get("checkIn", datetime.now().strftime("%I:%M %p")),
            "status": body.get("status"), # e.g., 'Present', 'Late'
            "timestamp": datetime.now()
        }

        # Firebase collection 'attendance' mein save karein
        _, doc_ref = db.collection("attendance").add(attendance_data)
        
        return {"message": "Attendance marked!", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get Attendance (Records dekhne ke liye)
@app.get("/attendance/{emp_id}")
async def get_employee_attendance(emp_id: str):
    try:
        docs = db.collection("attendance").where("empId", "==", emp_id).stream()
        return [{**doc.to_dict(), "id": doc.id} for doc in docs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
    
    
    
    
    
    # --- Data Models ---
class Intern(BaseModel):
    id: str
    name: str
    role: str
    checkInTime: Optional[str] = "10:00 AM"

class AttendanceRecord(BaseModel):
    user_id: str
    name: str
    status: str
    checkIn: str
    type: str  # 'Employee' ya 'Intern'

# --- Fake Databases (Lists) ---
# Yahan wo interns hain jo aapke table mein show honge
interns_list = [
    {"id": "int_1", "name": "Sania Afzal", "role": "Web Developer Intern", "checkInTime": "10:00 AM"},
    {"id": "int_2", "name": "Maleeka Zainab", "role": "UI/UX Intern", "checkInTime": "10:00 AM"},
]

attendance_history = []

# --- Endpoints ---

# 1. Interns ki list fetch karne ke liye
@app.get("/interns", response_model=List[Intern])
def get_interns():
    return interns_list

# 2. Interns ki attendance save karne ke liye
@app.post("/attendance/mark")
async def mark_attendance(record: AttendanceRecord):
    attendance_history.append(record.dict())
    print(f"Attendance Recorded: {record.name} - Status: {record.status}")
    return {"message": "Attendance marked successfully"}

# 3. History dekhne ke liye (Optional)
@app.get("/attendance/history")
def get_history():
    return attendance_history

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=7860)
    
# 2. Data Models
class ProjectUpdate(BaseModel):
    status: str
    completedAt: Optional[str] = None

# --- ROUTES ---

@app.get("/")
def home():
    return {"message": "Software House Backend API is Running"}

# Projects Analytics (Corrected collection name to "projects")
@app.get("/project-stats")
async def get_project_stats():
    projects_ref = db.collection("projects") # Match with Firebase
    docs = projects_ref.stream()
    
    stats = {"total": 0, "completed": 0, "in_progress": 0, "on_time": 0, "late": 0}
    
    for doc in docs:
        data = doc.to_dict()
        stats["total"] += 1
        
        if data.get("status") == "completed":
            stats["completed"] += 1
            try:
                # Safe Date Parsing
                deadline_str = data.get("deadline")
                comp_at_str = data.get("completedAt")
                
                if deadline_str and comp_at_str:
                    deadline = datetime.fromisoformat(deadline_str.split('T')[0])
                    completed_at = datetime.fromisoformat(comp_at_str.split('T')[0])
                    
                    if completed_at <= deadline:
                        stats["on_time"] += 1
                    else:
                        stats["late"] += 1
            except Exception:
                pass # Skip if date format is wrong
        else:
            stats["in_progress"] += 1
            
    return stats

# Leaderboard fetch
@app.get("/get-leaderboard/{person_type}")
def get_leaderboard(person_type: str):
    try:
        # person_type should be 'employees' or 'interns'
        docs = db.collection("projects")\
                 .where("personType", "==", person_type)\
                 .where("status", "==", "completed")\
                 .stream()
        
        results = [doc.to_dict() for doc in docs]
        return {"count": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-project-status/{project_id}")
def update_status(project_id: str, data: ProjectUpdate):
    try:
        project_ref = db.collection("projects").document(project_id)
        project_ref.update({
            "status": data.status,
            "completedAt": data.completedAt if data.status == "completed" else None
        })
        return {"status": "success", "message": f"Project {project_id} updated."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Hamesha file ke END mein uvicorn run karein
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
    
    
    
    
    
    
    
    
    
    
    #py -m uvicorn main:app --reload
    