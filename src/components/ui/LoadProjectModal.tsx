import { createSignal, createEffect, Show, For } from "solid-js";
import { useNodesContext } from "../context/NodesContext";
import { getAllProjects, deleteProject, type SavedProject } from "../../utils/projectStorage";

interface LoadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad?: (projectId: string) => void;
}

export function LoadProjectModal(props: LoadProjectModalProps) {
  const [projects, setProjects] = createSignal<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = createSignal<string | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isDeleting, setIsDeleting] = createSignal<string | null>(null);
  const [error, setError] = createSignal("");

  const { loadState } = useNodesContext();

  const loadProjects = () => {
    try {
      const allProjects = getAllProjects();
      setProjects(allProjects.sort((a, b) => 
        new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
      ));
    } catch (error) {
      setError("Failed to load saved projects");
      console.error("Load projects error:", error);
    }
  };

  createEffect(() => {
    if (props.isOpen) {
      loadProjects();
    }
  });

  const handleLoad = async () => {
    const projectName = selectedProject();
    if (!projectName) return;

    setIsLoading(true);
    setError("");

    try {
      const success = await loadState(projectName);
      if (success) {
        props.onLoad?.(projectName);
        props.onClose();
      } else {
        setError("Failed to load project. The project may be corrupted.");
      }
    } catch (error) {
      setError("Failed to load project. Please try again.");
      console.error("Load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectName: string, e: Event) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(projectName);
    
    try {
      const success = deleteProject(projectName);
      if (success) {
        loadProjects();
        if (selectedProject() === projectName) {
          setSelectedProject(null);
        }
      } else {
        setError("Failed to delete project");
      }
    } catch (error) {
      setError("Failed to delete project. Please try again.");
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClose = () => {
    if (!isLoading()) {
      setSelectedProject(null);
      setError("");
      props.onClose();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-[32rem] max-w-90vw max-h-80vh flex flex-col">
          <h2 class="text-xl font-semibold mb-4 text-gray-100">
            Load Project
          </h2>
          
          <div class="flex-1 overflow-y-auto">
            <Show when={projects().length === 0} fallback={
              <div class="space-y-2">
                <For each={projects()}>
                  {(project) => (
                    <div
                      class={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProject() === project.metadata.name
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      onClick={() => setSelectedProject(project.metadata.name)}
                    >
                      <div class="flex justify-between items-start">
                        <div class="flex-1 min-w-0">
                          <h3 class="font-medium text-gray-100 truncate">
                            {project.metadata.name}
                          </h3>
                          <Show when={project.metadata.description}>
                            <p class="text-sm text-gray-400 mt-1 line-clamp-2">
                              {project.metadata.description}
                            </p>
                          </Show>
                          <p class="text-xs text-gray-500 mt-2">
                            Updated: {formatDate(project.metadata.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(project.metadata.name, e)}
                          disabled={isDeleting() === project.metadata.name}
                          class="ml-3 p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                          title="Delete project"
                        >
                          {isDeleting() === project.metadata.name ? "..." : "×"}
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            }>
              <div class="text-center py-8 text-gray-400">
                No saved projects found
              </div>
            </Show>
          </div>

          <Show when={error()}>
            <div class="mt-4 text-red-400 text-sm">
              {error()}
            </div>
          </Show>

          <div class="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={isLoading()}
              class="flex-1 px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 disabled:(opacity-50 cursor-not-allowed)"
            >
              Cancel
            </button>
            <button
              onClick={handleLoad}
              disabled={isLoading() || !selectedProject()}
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:(opacity-50 cursor-not-allowed)"
            >
              {isLoading() ? "Loading..." : "Load"}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}