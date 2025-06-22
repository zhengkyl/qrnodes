import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, For, Show } from "solid-js";
import { deleteProject, getProjectNames } from "../utils/projectStorage";
import { useNodesContext } from "./context/NodesContext";

interface LoadProjectModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function LoadProjectModal(props: LoadProjectModalProps) {
  const [projects, setProjects] = createSignal<string[]>([]);
  const [selectedProject, setSelectedProject] = createSignal<string | null>(
    null
  );

  const { loadStateFrom } = useNodesContext();

  const loadProjects = () => {
    setProjects(getProjectNames());
  };

  createEffect(() => {
    if (props.open) {
      loadProjects();
    }
  });

  const handleLoad = async () => {
    const projectName = selectedProject();
    if (!projectName) return;

    loadStateFrom(projectName);
    setSelectedProject(null);
    props.setOpen(false);
  };

  const handleDelete = async (projectName: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    deleteProject(projectName);
    loadProjects();
    if (selectedProject() === projectName) {
      setSelectedProject(null);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <div class="fixed inset-0 flex items-center justify-center z-50">
          <Dialog.Content class="bg-gray-800 rounded-lg p-6 w-[32rem] max-w-90vw max-h-80vh flex flex-col focus:outline-none">
            <Dialog.Title class="text-xl font-semibold mb-4 text-gray-100">
              Load Project
            </Dialog.Title>

            <div class="flex-1 overflow-y-auto">
              <Show
                when={projects().length === 0}
                fallback={
                  <div class="space-y-2">
                    <For each={projects()}>
                      {(project) => (
                        <div
                          class={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedProject() === project
                              ? "border-blue-500 bg-blue-900/20"
                              : "border-gray-600 hover:border-gray-500"
                          }`}
                          onClick={() => setSelectedProject(project)}
                        >
                          <div class="flex justify-between items-start">
                            <div class="flex-1 min-w-0">
                              <h3 class="font-medium text-gray-100 truncate">
                                {project}
                              </h3>
                            </div>
                            <button
                              onClick={() => handleDelete(project)}
                              class="ml-3 p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                              title="Delete project"
                            >
                              x
                            </button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                }
              >
                <div class="text-center py-8 text-gray-400">
                  No saved projects found
                </div>
              </Show>
            </div>

            <div class="flex gap-3 mt-6">
              <Dialog.CloseButton class="flex-1 px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 disabled:(opacity-50 cursor-not-allowed)">
                Cancel
              </Dialog.CloseButton>
              <button
                onClick={handleLoad}
                disabled={!selectedProject()}
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:(opacity-50 cursor-not-allowed)"
              >
                Load
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
