import { Link, useParams, generatePath, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { tasksService } from "../services/tasks.services";
import type { Task } from "../types/task.types";
import { ROUTES } from "../../../app/routes/routes.constants";
import { useAuth } from "../../auth/hooks/useAuth";

export function TaskDetailsPage() {

  const { taskId } = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [ errorMessage, setErrorMessage ] = useState<string | null>(null);
  const [ isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [ isDeleting, setIsDeleting] = useState(false);
  const [ deleteErrorMessage, setDeleteErrorMessage ] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);



  useEffect(() => {
      if(!taskId){
        setErrorMessage("Brak projektu!");
        setIsLoading(false);
        return}

        let ignoreResult = false;
        setIsLoading(true);
        setErrorMessage(null);
        setTask(null);

    const fetchTask = async () => {
      try {
          const taskData = await tasksService.getById(taskId);
          if (ignoreResult){
                    return
                }
          if(taskData === undefined) {
                    setErrorMessage('Nie znaleziono historyjki')
                    return
                }
          setTask(taskData)
      } catch(error: unknown){
          if(!ignoreResult){
              console.error(error);
              setErrorMessage("Nie udało się pobrać historyjki");
          }
      } finally {
        if(!ignoreResult){
            setIsLoading(false);
        }
      }
    };
    void fetchTask();


    return () => {
    ignoreResult = true;
};
  }, [taskId]);

  if(isLoading){
    return <p>Ładujemy zadanie</p>
    }

  if(errorMessage){
        return <p role="alert">{errorMessage}</p>
    }

  if(!task){
    return <p>Brak danych zadania, nie ma :( </p>
  }

  const handleAssignToMe = async () => {
  if (!userProfile || isAssigning) {
    return;
  }

  setIsAssigning(true);
  setAssignError(null);

    try {
      const result = await tasksService.assignUserToTask(
        userProfile.uid,
        task.id,
      );

    if (!result.success) {
      setAssignError(
        "Nie udało się przypisać  - profil albo upraniena nei ok.",
      );
      return;
    }

    setTask((currentTask) =>
      currentTask?.id === result.task.id
        ? { ...currentTask, assignedUserId: result.task.assignedUserId }
        : currentTask,
    );
  } catch (error: unknown) {
    console.error(error);
    setAssignError("Nie udało się zapisać dodanie taska.");
  } finally {
    setIsAssigning(false);
  }
};

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{task.title}</h2>
      <p className="text-sm text-slate-500">{task.description}</p>
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">{task.priority}</span>
        <span>{task.estimatedHours ?? "-"}h</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">{task.status}</span>
        <span>
          Przypisany użytkownik:{" "}
          {userProfile && task.assignedUserId === userProfile.uid
            ? `${userProfile.displayName} (Ty)`
            : task.assignedUserId ?? "Brak"}
        </span>
        <button
          type="button"
          onClick={() => void handleAssignToMe()}
          disabled={
            isAssigning ||
            !userProfile ||
            task.assignedUserId === userProfile.uid
        }
        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAssigning
          ? "Przypisywanie..."
          : userProfile && task.assignedUserId === userProfile.uid
            ? "Przypisane do Ciebie"
            : "Przypisz do mnie"}
      </button>

      {assignError && (
        <p role="alert" className="text-sm text-red-600">
          {assignError}
        </p>
      )}
            </div>
            <Link to={`/projects/${task.projectId}/board`} className="text-blue-600 hover:underline">Powrót do tablicy zadań</Link>
          </div>
  );
}