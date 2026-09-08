import { storyService } from "../services/stories.service"
import { Link, useParams, generatePath, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Story } from "../types/story.types";
import { ROUTES } from "../../../app/routes/routes.constants";
import type { Task } from "../../tasks/types/task.types";
import { tasksService } from "../../tasks/services/tasks.services";

export function StoryDetailsPage(){
    const { projectId, storyId } = useParams();
    const [ story, setStory ] = useState<Story | null>(null)
    const [ tasks, setTasks ] = useState<Task[]>([])
    const [ errorMessage, setErrorMessage ] = useState<string | null>(null);
    const [ isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const [ isDeleting, setIsDeleting] = useState(false);
    const [ deleteErrorMessage, setDeleteErrorMessage ] = useState<string | null>(null);

    useEffect(()=> {
        if(!projectId){
            setErrorMessage("Brak projektu!");
            setIsLoading(false);
            return
        }

        if(!storyId){
            setErrorMessage("Brak projektu!");
            setIsLoading(false);
            return
        }
        
        let ignoreResult = false;
        setIsLoading(true);
        setErrorMessage(null);
        setStory(null);

        const loadStory = async ()=> {
            try{
                const loadedStory = await storyService.getById(storyId);
                if (ignoreResult){
                    return
                }
                if(loadedStory === undefined) {
                    setErrorMessage('Nie znaleziono historyjki')
                    return
                }

                if (loadedStory.projectId !== projectId) {
                    setErrorMessage("Nie ma historyjki w tym projekcie.");
                    return;
                }
                const loadedTasks = await tasksService.getByStoryId(loadedStory.id);
                if (ignoreResult) {
                    return;
                }
                setStory(loadedStory);
                setTasks(loadedTasks);

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
        }
        void loadStory();



  

        return () => {
            ignoreResult = true;
        };

    }, [storyId, projectId])


if(isLoading){
    return <p>Ładujemy historyjke</p>
}

if(errorMessage){
    return <p role="alert">{errorMessage}</p>
}

if (!story){
    return <p>„Brak danych historyjki</p>
}


const handleDelete = async() => {
        const confirmed = window.confirm("Wywalamy historyjkę?");

        if (!confirmed) {
            return;
        }

                try {
                    setIsDeleting(true);
                    setDeleteErrorMessage(null);
        
                    await storyService.deleteById(story.id);
                    navigate(
                        generatePath(ROUTES.storyBoard,{
                            projectId: story.projectId
                        }), {replace: true});
        
                } catch (error: unknown){
                    console.error(error);
                    setDeleteErrorMessage(
                        "Nie udało się usunąć historyjki.",
                    );
                } finally {
                    setIsDeleting(false);
                }

}

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <Link
                className="text-sm font-medium text-blue-600 hover:text-blue-800" 
                    to={generatePath(ROUTES.storyBoard, {
                        projectId: story.projectId,
                    })}>
                &larr; Wróc do Historyjek
            </Link>
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight text-slate-900">{story.name}</h1>
                <Link 
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"                    to={generatePath(ROUTES.editStory, {
                    projectId: story.projectId,
                    storyId: story.id
                    })}>Edytuj
                </Link>
                <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleDelete()}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >{isDeleting ? "Usuwanie..." : "Usuń"}
                </button>
                
            {deleteErrorMessage && (<p role="alert" className="text-sm text-red-600" >{deleteErrorMessage}</p>)}
            </div>
            <div className="flex flex-wrap gap-2">
                <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Status: {story.status}
                </p>
                <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Priorytet: {story.priority}
                </p>
            </div>

            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{story.description}</p>

            <div >
                <div className="grid gap-4 lg:grid-cols-3">
                    <section className="min-h-96 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">TO DO</h2>
                        <ul className="space-y-3">
                            { tasks.filter(task => task.status === "todo").map(task => (
                            <li className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={task.id}>
                                <Link
                                className="block w-full text-left text-sm font-semibold text-slate-950 hover:text-blue-600"
                                to={generatePath(ROUTES.taskDetails, {
                                    projectId: story.projectId,
                                    taskId: task.id
                                    })}
                                >
                                {task.title}
                                </Link>
                                <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{task.description}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                    <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">{task.priority}</span>
                                    <span>{task.estimatedHours ?? "-"}h</span>
                                </div>
                            </li>
                            ))}
                        </ul>
                    </section>

                    <section className="min-h-96 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">DOING</h2>
                        <ul className="space-y-3">
                            { tasks.filter(task => task.status === "doing").map(task => (
                            <li className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={task.id}>
                                <Link
                                className="block w-full text-left text-sm font-semibold text-slate-950 hover:text-blue-600"
                                to={generatePath(ROUTES.taskDetails, {
                                    projectId: story.projectId,
                                    taskId: task.id
                                    })}
                                >
                                {task.title}
                                </Link>
                                <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{task.description}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                    <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">{task.priority}</span>
                                    <span>{task.estimatedHours ?? "-"}h</span>
                                </div>
                            </li>
                            ))}
                        </ul>
                    </section>

                    <section className="min-h-96 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">DONE</h2>
                        <ul className="space-y-3">
                            { tasks.filter(task => task.status === "done").map(task => (
                            <li className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={task.id}>
                                <Link
                                className="block w-full text-left text-sm font-semibold text-slate-950 hover:text-blue-600"
                                to={generatePath(ROUTES.taskDetails, {
                                    projectId: story.projectId,
                                    taskId: task.id
                                    })}
                                >
                                {task.title}
                                </Link>
                                <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{task.description}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">{task.priority}</span>
                                <span>{task.estimatedHours ?? "-"}h</span>
                                </div>
                            </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>

        </div>

    )

}
