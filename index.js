//console.log("hello world")

/* 
  client side
    template: static template
    logic(js): MVC(model, view, controller): used to server side technology, single page application
        model: prepare/manage data,
        view: manage view(DOM),
        controller: business logic, event bindind/handling

  server side
    json-server
    CRUD: create(post), read(get), update(put, patch), delete(delete)


*/
const myFetch = (url, options) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || "GET", url);

    // Set headers
    if (options.headers) {
      Object.keys(options.headers).forEach((key) => {
        xhr.setRequestHeader(key, options.headers[key]);
      });
    }

    // Handle response
    xhr.onload = () => {
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: xhr.getAllResponseHeaders(),
        url: xhr.responseURL,
      };
      response.text = () => Promise.resolve(xhr.responseText);
      response.json = () => Promise.resolve(JSON.parse(xhr.responseText));
      resolve(response);
    };

    // Handle errors
    xhr.onerror = () => {
      reject(new TypeError("Network request failed"));
    };

    // Send request
    xhr.send(options.body);
  });
};

const APIs = (() => {
  const createTodo = (newTodo) => {
    return fetch("http://localhost:3000/todos", {
      method: "POST",
      body: JSON.stringify(newTodo),
      headers: { "Content-Type": "application/json" },
    }).then((res) => res.json());
  };

  const deleteTodo = (id) => {
    return fetch("http://localhost:3000/todos/" + id, {
      method: "DELETE",
    }).then((res) => res.json());
  };

  const updateTodo = (id, updatedTodo) => {
    return fetch("http://localhost:3000/todos/" + id, {
      method: "PUT",
      body: JSON.stringify(updatedTodo),
      headers: { "Content-Type": "application/json" },
    }).then((res) => res.json);
  };

  const getTodos = () => {
    return myFetch("http://localhost:3000/todos", { method: "GET" }).then(
      (res) => res.json()
    );
  };
  return { createTodo, deleteTodo, getTodos, updateTodo };
})();

const Model = (() => {
  class State {
    #todos; //private field
    #onChange; //function, will be called when setter function todos is called
    constructor() {
      this.#todos = { pending: [], completed: [] };
    }
    get todos() {
      return this.#todos;
    }
    set todos(newTodos) {
      // reassign value
      this.#todos = newTodos;
      this.#onChange?.(); // rendering
    }

    subscribe(callback) {
      //subscribe to the change of the state todos
      this.#onChange = callback;
    }
  }
  const { getTodos, createTodo, deleteTodo, updateTodo } = APIs;
  return {
    State,
    getTodos,
    createTodo,
    deleteTodo,
    updateTodo,
  };
})();

const View = (() => {
  const pendingListEl = document.querySelector(".pending-list");
  const submitBtnEl = document.querySelector(".submit-btn");
  const inputEl = document.querySelector(".input");
  const completedListEl = document.querySelector(".completed-list");
  const formEl = document.querySelector(".form");

  const renderTodos = (todos) => {
    let pendingTodosTemplate = "";
    let completedTodosTemplate = "";

    todos.forEach((todo) => {
      const liTemplate = `${
        !todo.completed
          ? `
        <li class="list-item" id="${todo.id}">
            <span contenteditable="false">${todo.content}</span>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
            <button class="move-btn">&rarr;</button>
        </li>`
          : `
        <li class="list-item" id="${todo.id}">
            <button class="move-btn">&larr;</button>
            <span contenteditable="false">${todo.content}</span>
            <button class="edit-btn">Edit</button> 
            <button class="delete-btn">Delete</button>            
        </li>`
      }`;

      if (todo.completed) completedTodosTemplate += liTemplate;
      else pendingTodosTemplate += liTemplate;
    });

    if (pendingTodosTemplate === "") {
      pendingTodosTemplate = "<h4>No pending tasks!</h4>";
    }

    if (completedTodosTemplate === "") {
      completedTodosTemplate = "<h4>No completed tasks!</h4>";
    }
    pendingListEl.innerHTML = pendingTodosTemplate;
    completedListEl.innerHTML = completedTodosTemplate;
  };

  const clearInput = () => {
    inputEl.value = "";
  };

  return {
    renderTodos,
    submitBtnEl,
    inputEl,
    formEl,
    completedListEl,
    clearInput,
    pendingListEl,
  };
})();

const Controller = ((view, model) => {
  const state = new model.State();
  const init = () => {
    model.getTodos().then((todos) => {
      todos.reverse();
      state.todos = todos;
    });
  };

  const handleSubmit = () => {
    view.submitBtnEl.addEventListener("click", (event) => {
      event.preventDefault();
      const inputValue = view.inputEl.value;
      model
        .createTodo({ content: inputValue, completed: false })
        .then((data) => {
          state.todos = [data, ...state.todos];
          view.clearInput();
        });
    });
  };

  const handleDelete = () => {
    //event bubbling
    /* 
            1. get id
            2. make delete request
            3. update view, remove
        */
    document.addEventListener("click", (event) => {
      if (event.target.className === "delete-btn") {
        const id = event.target.parentElement.id;
        model.deleteTodo(+id).then((data) => {
          state.todos = state.todos.filter((todo) => todo.id !== +id);
        });
      }
    });
  };

  const handleMove = () => {
    document.addEventListener("click", (event) => {
      if (event.target.className === "move-btn") {
        const id = event.target.parentElement.id;
        const todo = state.todos.find((todo) => todo.id === +id);
        const updatedTodo = { ...todo, completed: !todo.completed };
        model.updateTodo(+id, updatedTodo).then(() => {
          state.todos = state.todos.map((todo) => {
            return todo.id === +id ? updatedTodo : todo;
          });
        });
      }
    });
  };

  const handleEdit = () => {
    document.addEventListener("click", (event) => {
      if (event.target.className === "edit-btn") {
        const liEl = event.target.closest("li");
        const spanEl = liEl.querySelector("span");
        const editBtn = liEl.querySelector(".edit-btn");
        const isEditable = spanEl.isContentEditable;

        spanEl.contentEditable = !isEditable;
        spanEl.focus();
        editBtn.textContent = isEditable ? "Edit" : "Save";

        if (isEditable) {
          const updatedContent = spanEl.textContent.trim();
          const id = liEl.id;
          const todo = state.todos.find((todo) => todo.id === +id);
          const updatedTodo = { ...todo, content: updatedContent };
          model.updateTodo(+id, updatedTodo).then(() => {
            state.todos = state.todos.map((todo) => {
              return todo.id === +id ? updatedTodo : todo;
            });
          });
        }
      }
    });
  };

  const bootstrap = () => {
    init();
    handleSubmit();
    handleDelete();
    handleMove();
    handleEdit();
    state.subscribe(() => {
      view.renderTodos(state.todos);
    });
  };
  return {
    bootstrap,
  };
})(View, Model); //ViewModel

Controller.bootstrap();
