// const getProjectListDiv = () =>
//   document.querySelector(`.${projectStyles.projectList}`)!;

const onUserLoggedIn = () => {
  // changeUI("authArea", "hide");
  // changeUI("projectArea", "show");
  // changeUI("todoArea", "show");
  // getProjects(getProjectListDiv(), showProjectList);
  // createRoutes();
};

const onUserLoggedOut = () => {
  // changeUI("authArea", "show");
  // changeUI("projectArea", "hide");
  // changeUI("todoArea", "hide");
};

export { onUserLoggedOut, onUserLoggedIn };
