-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 23-03-2026 a las 01:35:49
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sistema_login`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `averias`
--

CREATE TABLE `averias` (
  `id` int(11) NOT NULL,
  `codigo_de_barras` varchar(255) NOT NULL,
  `id_personal_usuario` varchar(255) DEFAULT NULL,
  `descripcion_averia` text NOT NULL,
  `fecha_averia` date NOT NULL,
  `estado` varchar(50) DEFAULT 'Pendiente',
  `fecha_registro` timestamp NULL DEFAULT current_timestamp(),
  `cantidad` int(11) NOT NULL DEFAULT 0,
  `empresa_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `averias`
--

INSERT INTO `averias` (`id`, `codigo_de_barras`, `id_personal_usuario`, `descripcion_averia`, `fecha_averia`, `estado`, `fecha_registro`, `cantidad`, `empresa_id`) VALUES
(5, '30997521255', '1112298406', 'tapa dañada', '2026-02-08', 'En Revisión', '2026-02-09 01:49:11', 1, 3),
(6, '603084088485', '1112298406', 'tapa rota', '2026-02-16', 'Descartado', '2026-02-17 01:29:56', 1, 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empresas`
--

CREATE TABLE `empresas` (
  `id` int(11) NOT NULL,
  `nombre_empresa` varchar(100) NOT NULL,
  `rnc_aruba` varchar(20) DEFAULT NULL,
  `plan_suscripcion` enum('basico','premium','admin') DEFAULT 'basico',
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `id_personal` varchar(50) DEFAULT NULL,
  `nombre_dueno` varchar(150) DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `empresas`
--

INSERT INTO `empresas` (`id`, `nombre_empresa`, `rnc_aruba`, `plan_suscripcion`, `direccion`, `telefono`, `id_personal`, `nombre_dueno`, `fecha_registro`) VALUES
(1, 'Prueba', '12345', 'premium', 'sabana liber', '5653481', '1130627903', 'Gustavo Aragon', '2026-02-08 19:12:54'),
(2, 'Prueba 1', '6788', 'premium', 'saba', '8792087', '7890927', 'as', '2026-02-08 19:20:04'),
(3, 'Prueba 2', '4875', 'premium', 'saba', '59545879', '1112298406', 'claudia', '2026-02-08 19:39:42');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario`
--

CREATE TABLE `inventario` (
  `id` int(11) NOT NULL,
  `codigo_de_barras` varchar(255) NOT NULL,
  `codigo` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `cantidad` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `pasillo` varchar(255) NOT NULL,
  `id_personal_usuario` varchar(50) DEFAULT NULL,
  `empresa_id` int(11) DEFAULT 1,
  `cantidad_total` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `inventario`
--

INSERT INTO `inventario` (`id`, `codigo_de_barras`, `codigo`, `descripcion`, `cantidad`, `fecha`, `precio`, `pasillo`, `id_personal_usuario`, `empresa_id`, `cantidad_total`) VALUES
(31, '981234567890', '1', 'brocha', 9, '2026-03-10', 0.00, '4', '1112298406', 3, 0),
(32, '981234567891', '2', 'espatula', 6, '2026-03-10', 0.00, 'General', '0', 3, 0),
(33, '981234567892', '3', 'pala', 9, '2026-03-10', 0.00, 'General', '0', 3, 0),
(34, '981234567893', '4', 'tornillo', 4, '2026-03-10', 0.00, 'General', '0', 3, 0),
(35, '981234567894', '5', 'brocha', 6, '2026-03-10', 0.00, 'General', '0', 3, 0),
(36, '981234567895', '6', 'espatula', 9, '2026-03-10', 0.00, 'General', '0', 3, 0),
(37, '981234567896', '7', 'pala', 4, '2026-03-10', 0.00, 'General', '0', 3, 0),
(38, '981234567897', '8', 'tornillo', 6, '2026-03-10', 0.00, 'General', '0', 3, 0),
(39, '981234567898', '9', 'brocha', 9, '2026-03-10', 0.00, 'General', '0', 3, 0),
(40, '981234567899', '10', 'espatula', 4, '2026-03-10', 0.00, 'General', '0', 3, 0),
(41, '981234567900', '11', 'pala', 6, '2026-03-10', 0.00, 'General', '0', 3, 0),
(42, '981234567901', '12', 'tornillo', 9, '2026-03-10', 0.00, 'General', '0', 3, 0),
(43, '884394000774', '0077', 'Aloe 500 ml', 1, '2026-03-15', 4.50, 'w', '1112298406', 3, 0),
(44, '038000306792', '679', 'Rice Krispies TREATS', 7, '2026-03-18', 30.00, '2', '1112298406', 3, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registros`
--

CREATE TABLE `registros` (
  `id` int(11) NOT NULL,
  `codigo_de_barras` varchar(50) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT 0,
  `empresa_id` int(11) NOT NULL,
  `nombre_usuario` varchar(100) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  `tipo` varchar(20) DEFAULT 'Ingreso',
  `codigo` varchar(50) DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `pasillo` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `registros`
--

INSERT INTO `registros` (`id`, `codigo_de_barras`, `cantidad`, `usuario_id`, `empresa_id`, `nombre_usuario`, `fecha`, `tipo`, `codigo`, `descripcion`, `precio`, `pasillo`) VALUES
(1, '981234567890', 4, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '1', 'brocha', 0.00, 'General'),
(2, '981234567891', 6, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '2', 'espatula', 0.00, 'General'),
(3, '981234567892', 9, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '3', 'pala', 0.00, 'General'),
(4, '981234567893', 4, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '4', 'tornillo', 0.00, 'General'),
(5, '981234567894', 6, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '5', 'brocha', 0.00, 'General'),
(6, '981234567895', 9, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '6', 'espatula', 0.00, 'General'),
(7, '981234567896', 4, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '7', 'pala', 0.00, 'General'),
(8, '981234567897', 6, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '8', 'tornillo', 0.00, 'General'),
(9, '981234567898', 9, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '9', 'brocha', 0.00, 'General'),
(10, '981234567899', 4, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '10', 'espatula', 0.00, 'General'),
(11, '981234567900', 6, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '11', 'pala', 0.00, 'General'),
(12, '981234567901', 9, 0, 3, NULL, '2026-03-10 22:42:19', 'Ingreso', '12', 'tornillo', 0.00, 'General'),
(13, '038000306792', 5, 0, 3, 'claudia', '2026-03-18 20:21:15', 'INGRESO MANUAL', NULL, NULL, NULL, '2'),
(14, '981234567890', 5, 0, 3, 'claudia', '2026-03-18 20:24:45', 'INGRESO MANUAL', NULL, NULL, NULL, '4');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre_usuario` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `id_personal` varchar(50) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'employee',
  `empresa_id` int(11) DEFAULT 1,
  `nombre_completo_dueno` varchar(150) DEFAULT NULL,
  `verificado` tinyint(1) DEFAULT 0,
  `aprobado_por_admin` tinyint(1) DEFAULT 0,
  `token_verificacion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre_usuario`, `email`, `id_personal`, `contrasena`, `role`, `empresa_id`, `nombre_completo_dueno`, `verificado`, `aprobado_por_admin`, `token_verificacion`, `activo`) VALUES
(1, 'Gustavo Aragon', '', '1130627903', '$2b$10$KBZBzPQHe0UMauENPzOzTeojaZdR9bzfRN.4yvgHjHDDYEEtl3qrS', 'admin', 1, NULL, 0, 0, NULL, 1),
(2, 'as', '', '7890927', '$2b$10$SkR8SabV826bXeQ0r/ayS.KiHcji18uZoa/d5Sw4qS8gCwxfW52we', 'admin', 2, NULL, 0, 0, NULL, 1),
(3, 'claudia', 'gustavoarag.sala@gmail.com', '1112298406', '$2b$10$wWwrePyhdNS5QFXcB1.ClelB.LAT2SJDvzXnfAS.kndhOSA1NQePC', 'admin', 3, NULL, 1, 1, NULL, 1),
(5, 'adolfo salazar', 'gncb8630@hotmail.com', '759678', '$2b$10$Ek.WM2rDbRc0eGP/moHIIOHfUoK1XYjW9a4I3jNhxv9EqfWB.O3FS', 'empleado', 3, NULL, 1, 1, NULL, 1);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `averias`
--
ALTER TABLE `averias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_averia_usuario_oficial` (`id_personal_usuario`);

--
-- Indices de la tabla `empresas`
--
ALTER TABLE `empresas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `inventario`
--
ALTER TABLE `inventario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `prod_empresa_idx` (`codigo_de_barras`,`empresa_id`),
  ADD KEY `fk_inventario_empresa` (`empresa_id`);

--
-- Indices de la tabla `registros`
--
ALTER TABLE `registros`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  ADD UNIQUE KEY `id_personal` (`id_personal`),
  ADD UNIQUE KEY `id_personal_2` (`id_personal`),
  ADD KEY `fk_empresa` (`empresa_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `averias`
--
ALTER TABLE `averias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `empresas`
--
ALTER TABLE `empresas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT de la tabla `registros`
--
ALTER TABLE `registros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `averias`
--
ALTER TABLE `averias`
  ADD CONSTRAINT `fk_averia_usuario_oficial` FOREIGN KEY (`id_personal_usuario`) REFERENCES `usuarios` (`id_personal`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `inventario`
--
ALTER TABLE `inventario`
  ADD CONSTRAINT `fk_inventario_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_usuario_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
