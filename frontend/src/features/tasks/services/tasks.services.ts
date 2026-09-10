import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, updateDoc } from "firebase/firestore";
import { db } from "../../../app/firebase/firebase";
import { storyService } from "../../stories/services/stories.service";
import type { Story } from "../../stories/types/story.types";
import type { Task, CreateTaskDto, UpdateTaskDto, TaskOperationResult } from "../types/task.types";
import { userProfileService } from "../../users/services/userProfile.service";

const TASKS_COLLECTION = "tasks";

const mapTaskDocument = (documentId: string, data: unknown): Task => ({
  ...(data as Omit<Task, "id">),
  id: documentId,
});

const getAll = async (): Promise<Task[]> => {
  const snapshot = await getDocs(collection(db, TASKS_COLLECTION));

  return snapshot.docs.map((document) => mapTaskDocument(document.id, document.data()));
};

const getById = async (id: string): Promise<Task | undefined> => {
  const snapshot = await getDoc(doc(db, TASKS_COLLECTION, id));

  if (!snapshot.exists()) {
    return undefined;
  }

  return mapTaskDocument(snapshot.id, snapshot.data());
};

const getByStoryId = async (storyId: string): Promise<Task[]> => {
  const tasksQuery = query(
    collection(db, TASKS_COLLECTION),
    where("storyId", "==", storyId),
  );
  const snapshot = await getDocs(tasksQuery);

  return snapshot.docs.map((document) => mapTaskDocument(document.id, document.data()));
};

const getByProjectId = async (projectId: string): Promise<Task[]> => {
  const tasksQuery = query(
    collection(db, TASKS_COLLECTION),
    where("projectId", "==", projectId),
  );
  const snapshot = await getDocs(tasksQuery);

  return snapshot.docs.map((document) => mapTaskDocument(document.id, document.data()));
};

const createForStory = async (
  storyId: string,
  data: CreateTaskDto,
): Promise<TaskOperationResult> => {
  const currentStory: Story | undefined = await storyService.getById(storyId);

  if (!currentStory) return { success: false, reason: "story-not-found" };
  if (data.title.trim() === "") return { success: false, reason: "invalid-title" };
  if (data.description.trim() === "") return { success: false, reason: "invalid-description" };
  if (data.estimatedHours !== undefined && data.estimatedHours <= 0) {
    return { success: false, reason: "invalid-estimated-hours" };
  }

  const taskRef = doc(collection(db, TASKS_COLLECTION));
  const newTask: Task = {
    id: taskRef.id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    estimatedHours: data.estimatedHours,
    storyId,
    projectId: currentStory.projectId,
    workedHours: 0,
    status: "todo",
    createdAt: new Date().toISOString(),
  };

  await setDoc(taskRef, newTask);

  return { success: true, task: newTask };
};

const update = async (id: string, data: UpdateTaskDto): Promise<Task | undefined> => {
  const taskToUpdate = await getById(id);

  if (!taskToUpdate) {
    return undefined;
  }

  const updatedTask: Task = {
    ...taskToUpdate,
    ...data,
  };

  await setDoc(doc(db, TASKS_COLLECTION, id), updatedTask);

  return updatedTask;
};

const deleteById = async (id: string): Promise<Task[]> => {
  await deleteDoc(doc(db, TASKS_COLLECTION, id));

  return getAll();
};

const assignUserToTask = async (
  userId: string,
  taskId: string,
): Promise<TaskOperationResult> => {
  const task = await getById(taskId);

  if (!task) {
    return { success: false, reason: "task-not-found" };
  }

  const user = await userProfileService.getByUid(userId);

  if (!user) {
    return { success: false, reason: "user-not-found" };
  }

  if (
    user.isBlocked ||
    !["admin", "developer", "devops"].includes(user.role)
  ) {
    return { success: false, reason: "user-role-not-allowed" };
  }

  if (task.assignedUserId === userId) {
    return { success: true, task };
  }

  await updateDoc(doc(db, TASKS_COLLECTION, taskId), {
    assignedUserId: userId,
  });

  return {
    success: true,
    task: { ...task, assignedUserId: userId },
  };
};

const markTaskAsDone = async (taskId: string): Promise<TaskOperationResult> => {
  const taskToUpdate = await getById(taskId);

  if (taskToUpdate === undefined) return { success: false, reason: "task-not-found" };
  if (!taskToUpdate.assignedUserId) return { success: false, reason: "user-not-assigned" };

  if (taskToUpdate.status === "done") {
    return { success: true, task: taskToUpdate };
  }

  const completedAt = new Date().toISOString();
  const workedHours = taskToUpdate.startedAt
    ? Math.round(((Date.parse(completedAt) - Date.parse(taskToUpdate.startedAt)) / 3600000) * 100) / 100
    : 0;
  const updatedTask: Task = {
    ...taskToUpdate,
    status: "done",
    completedAt,
    workedHours,
  };

  await setDoc(doc(db, TASKS_COLLECTION, taskId), updatedTask);

  const tasksFromCurrentStory: Task[] = await getByStoryId(taskToUpdate.storyId);
  const allTasksInStoryDone = tasksFromCurrentStory.every((task) => task.status === "done");

  if (allTasksInStoryDone) {
    await storyService.updateStory(taskToUpdate.storyId, { status: "done" });
  }

  return { success: true, task: updatedTask };
};

export const tasksService = {
  getAll,
  getById,
  getByStoryId,
  getByProjectId,
  createForStory,
  update,
  deleteById,
  markTaskAsDone,
  assignUserToTask,
};
