import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List
import pandas as pd


def plot_genre_temporal_analysis(
        barplot_data: pd.DataFrame,
        duration_data: pd.DataFrame,
        actors_data: pd.DataFrame,
        palette: List,
        figsize: tuple = (20, 18)
) -> None:
    """
    Crea i tre grafici di analisi temporale mantenendo TUTTI i commenti originali.

    Args:
        barplot_data: DataFrame per il barplot (genre_count_by_interval)
        duration_data: DataFrame per il lineplot durata (genre_duration)
        actors_data: DataFrame per il lineplot attori (genre_actors)
        palette: Lista di colori per i generi
        figsize: Dimensioni figura (default: (20, 18))
    """
    # Crea una figura con un layout personalizzato (commento originale)
    fig = plt.figure(figsize=figsize)

    # --- Grafico 1: Barplot raggruppato --- (commento originale)
    ax1 = plt.subplot2grid((4, 1), (0, 0), rowspan=2)
    barplot_data.plot(kind='bar', stacked=True, ax=ax1, color=palette, width=0.8, alpha=0.7)

    ax1.set_title('Numero di Film per Genere (per Intervalli di 4 Anni)')
    ax1.set_ylabel('Numero di Film')
    ax1.set_xlabel('Intervallo di Anni')
    ax1.legend(title='Genere', bbox_to_anchor=(1.05, 0.5), loc='center left')
    ax1.tick_params(axis='x', rotation=45)

    # --- Grafico 2: Lineplot durata --- (commento originale)
    ax2 = plt.subplot2grid((4, 2), (2, 0), colspan=1)
    for i, genre in enumerate(duration_data.columns):
        ax2.plot(duration_data.index, duration_data[genre],
                 color=palette[i], label=f'Durata Media ({genre})', linewidth=2)

    ax2.set_title('Durata Media dei Film per Genere (Anno per Anno)')
    ax2.set_ylabel('Durata Media (minuti)')
    ax2.legend(title='Genere', bbox_to_anchor=(0.5, -0.3), loc='upper center', ncol=3)

    # --- Grafico 3: Lineplot attori --- (commento originale)
    ax3 = plt.subplot2grid((4, 2), (2, 1), colspan=1)
    for i, genre in enumerate(actors_data.columns):
        ax3.plot(actors_data.index, actors_data[genre],
                 color=palette[i], label=f'Attori Medi ({genre})', linewidth=2)

    ax3.set_title('Numero Medio di Attori per Genere (Anno per Anno)')
    ax3.set_ylabel('Numero Medio di Attori')
    ax3.legend(title='Genere', bbox_to_anchor=(0.5, -0.3), loc='upper center', ncol=3)

    plt.tight_layout()
    plt.show()